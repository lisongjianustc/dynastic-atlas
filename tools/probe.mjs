/**
 * 用 Chrome DevTools Protocol 直接读页面控制台与网络记录。
 * 无头截图只能告诉你「是黑的」，这个能告诉你「为什么黑」。
 *
 *   node tools/probe.mjs <url> [port]
 */
const URL_ = process.argv[2] ?? 'http://localhost:4173/?y=750';
const PORT = process.argv[3] ?? '9223';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let targets = [];
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      targets = await res.json();
      if (targets.some((t) => t.type === 'page' && t.webSocketDebuggerUrl)) break;
    } catch {
      /* chrome not up yet */
    }
    await sleep(500);
  }
  const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!page) throw new Error('no debuggable page target found');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const logs = [];
  const exceptions = [];

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args ?? [])
        .map((a) => a.value ?? a.description ?? a.unserializableValue ?? '')
        .join(' ');
      logs.push(`[${msg.params.type}] ${text}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      exceptions.push(`${d.text} ${d.exception?.description ?? ''}`.trim());
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level !== 'verbose') {
      logs.push(`[log:${msg.params.entry.level}] ${msg.params.entry.text}`);
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
  await send('Page.navigate', { url: URL_ });

  await sleep(9000);

  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r?.exceptionDetails) return `THREW: ${r.exceptionDetails.text}`;
    return r?.result?.value;
  };

  const diag = await evaluate(`(() => {
    const canvas = document.querySelector('.maplibregl-canvas');
    const m = window.__atlasMap;
    const res = performance.getEntriesByType('resource').map(r => {
      const n = r.name.split('/').pop().split('?')[0];
      return n + ':' + (r.responseStatus ?? '?');
    });
    return JSON.stringify({
      canvas: !!canvas,
      canvasSize: canvas ? canvas.width + 'x' + canvas.height : null,
      mapExists: !!m,
      mapLoaded: m ? m.loaded() : null,
      styleLoaded: m ? m.isStyleLoaded() : null,
      styleSources: m ? Object.keys(m.getStyle()?.sources ?? {}) : null,
      styleLayers: m ? (m.getStyle()?.layers ?? []).map(l => l.id) : null,
      hasLandSource: m ? !!m.getSource('land') : null,
      hasTerrSource: m ? !!m.getSource('territories') : null,
      fatal: document.querySelector('.map-error')?.innerText ?? null,
      warn: document.querySelector('.map-warn')?.innerText ?? null,
      resources: res,
    }, null, 1);
  })()`);

  console.log('=== 诊断 ===');
  console.log(diag);
  console.log('\n=== 控制台 ===');
  console.log(logs.length ? logs.join('\n') : '(空)');
  console.log('\n=== 未捕获异常 ===');
  console.log(exceptions.length ? exceptions.join('\n') : '(无)');

  ws.close();
}

main().catch((e) => {
  console.error('probe failed:', e.message);
  process.exit(1);
});
