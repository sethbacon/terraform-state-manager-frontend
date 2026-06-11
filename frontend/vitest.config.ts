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
        // Ratchet floor — raise with every change that touches an area.
        // Campaign target: 80/85/85/80.
        // History: 0.5/40/25/0.5 (bootstrap) → 25/80/80/25 (2026-06-10)
        // → 42/85/80/42 (F1 query-page suites, 2026-06-11).
        statements: 42,
        branches: 85,
        functions: 80,
        lines: 42,
      },
    },
  },
})
