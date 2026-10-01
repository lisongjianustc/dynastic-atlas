import { defineConfig } from '@playwright/test';

/**
 * 端到端测试。
 *
 * 两个关键设定：
 *   channel: 'chrome'  —— 复用本机已装的 Google Chrome，不下载浏览器
 *   swiftshader 参数   —— 无头环境下 MapLibre 需要软件渲染才拿得到 WebGL 上下文
 *
 * 超时给得比常规宽：无头 SwiftShader 下地图初始化要 10 秒上下，
 * 地图就绪由 `window.__atlasMap.loaded()` 轮询判定，而不是靠 sleep 猜。
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'list' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 960 },
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
