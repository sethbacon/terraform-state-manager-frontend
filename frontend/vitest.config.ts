import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify('0.0.0-test'),
  },
  test: {
    environment: 'happy-dom',
    setupFiles: './src/setupTests.ts',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/main.tsx',
        'src/setupTests.ts',
        'src/vite-env.d.ts',
        'src/**/*.d.ts',
      ],
      thresholds: {
        // Ratchet floor — raise with every change that touches an area. The
        // registry frontend enforces 80/70/70/80; that's the statements/lines
        // target (branches/functions already exceed it).
        // History: 0.5/40/25/0.5 (bootstrap) → 25/80/80/25 (2026-06-10 test build-out).
        statements: 25,
        branches: 80,
        functions: 80,
        lines: 25,
      },
    },
  },
})
