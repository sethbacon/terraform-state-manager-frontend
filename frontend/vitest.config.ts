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
    // Registry parity: heavy MUI dialog renders exceed the 5s default on
    // shared CI runners (first Actions run timed out two gapfill tests).
    testTimeout: 15_000,
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
        // Campaign target 80/85/85/80 (registry-FE parity) REACHED:
        // actuals 95.9/85.6/85.9/95.9 on 2026-06-11.
        // History: 0.5/40/25/0.5 (bootstrap) → 25/80/80/25 (2026-06-10)
        // → 42/85/80/42 (F1) → 58/85/80/58 (F2 admin CRUD)
        // → 80/85/85/80 (F3+F4 giants + app shell, 2026-06-11).
        statements: 80,
        branches: 85,
        functions: 85,
        lines: 80,
      },
    },
  },
})
