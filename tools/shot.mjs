/**
 * CDP 截图：轮询到地图真正就绪再拍，避免「拍得太早拿到一张黑图」。
 *
 *   node tools/shot.mjs <url> <out.png> [width] [height] [port]
 *
 * 前提：Chrome 已带 --remote-debugging-port=<port> 启动（见 tools/shot.sh）。
 */
import { writeFileSync } from 'node:fs';

const URL_ = process.argv[2];
const OUT = process.argv[3];
const W = Number(process.argv[4] ?? 1680);
const H = Number(process.argv[5] ?? 1000);
const PORT = process.argv[6] ?? '9223';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let page = null;
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) break;
    } catch {
      /* not up yet */
    }
    await sleep(400);
  }
  if (!page) throw new Error('no debuggable page');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const console_ = [];
  const bad = [];

  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result);
      pending.delete(m.id);
      return;
    }
    if (m.method === 'Runtime.consoleAPICalled') {
      console_.push(`[${m.params.type}] ${(m.params.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ')}`);
    }
    if (m.method === 'Runtime.exceptionThrown') {
      console_.push(`[throw] ${m.params.exceptionDetails.text} ${m.params.exceptionDetails.exception?.description ?? ''}`);
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      console_.push(`[log] ${m.params.entry.text}`);
    }
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
      bad.push(`${m.params.response.status} ${m.params.response.url}`);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const mid = ++id;
      pending.set(mid, resolve);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  await new Promise((r) => ws.addEventListener('open', r));
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL_ });

  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return r?.exceptionDetails ? null : r?.result?.value;
  };

  // 先确认页面本身起来了。打到一个死端口时，干等 60 秒毫无意义。
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    const alive = await evaluate(`!!document.querySelector('#root')?.children.length`);
    if (alive) break;
    const title = await evaluate(`document.title`);
    if (i === 19) {
      console.log(`FAILED: 页面没有渲染 —— 服务器在跑吗？title=${JSON.stringify(title)}`);
      ws.close();
      process.exit(1);
    }
  }

  // 等到地图真正加载完（最多 60 秒），再等一拍让过渡动画落定
  let ready = false;
  for (let i = 0; i < 120; i++) {
    await sleep(500);
    const state = await evaluate(
      `(() => { const m = window.__atlasMap; if (!m) return null;
         return JSON.stringify({ ok: m.loaded() && m.isStyleLoaded() && !!m.getSource('territories'),
           err: document.querySelector('.map-error') ? document.querySelector('.map-error').innerText : null }); })()`,
    );
    if (state) {
      const s = JSON.parse(state);
      if (s.err) {
        console.log(`MAP ERROR: ${s.err}`);
        break;
      }
      if (s.ok) {
        ready = true;
        break;
      }
    }
  }
  await sleep(1500);

  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  if (shot?.data) {
    writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
    console.log(`OK ${OUT} (mapReady=${ready})`);
  } else {
    console.log('FAILED: no screenshot data');
  }

  if (bad.length) console.log('HTTP >= 400:\n  ' + [...new Set(bad)].join('\n  '));
  const errs = console_.filter((l) => /error|throw/i.test(l));
  if (errs.length) console.log('控制台错误:\n  ' + [...new Set(errs)].slice(0, 8).join('\n  '));
  else console.log('控制台错误: 无');

  ws.close();
}

main().catch((e) => {
  console.error('shot failed:', e.message);
  process.exit(1);
});
