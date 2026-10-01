import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' keeps the build portable: GitHub Pages project sites, or opened from any subpath.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    globals: true,
    // 默认 node 环境：数据、状态机、几何测试都不需要 DOM，跑得快。
    // 需要 DOM 的用例在文件顶部写 `// @vitest-environment jsdom`。
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['./tests/setup.ts'],
  },
});
