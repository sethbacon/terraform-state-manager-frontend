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
    // Paired with the asyncUtilTimeout raise in setupTests.ts — that governs
    // individual findBy*/waitFor polling, this governs the whole test.
    testTimeout: 15_000,
    // Vitest's default for `run` mode is cpus-1 workers, which on an 8-core
    // dev machine leaves near-zero headroom once the OS, editor, and browser
    // are also competing for CPU — MUI/happy-dom renders then blow past both
    // timeouts above under contention (flaky failures on full-suite local
    // runs that don't reproduce running a file in isolation). Cap at half the
    // cores so individual test files still get enough CPU to render on time.
    maxWorkers: '50%',
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
        // Recalibrated 2026-06-13 for the vitest 3->4 bump: vitest 4's v8
        // coverage remapper reports different totals for the SAME (all-green,
        // 363/363) suite — actuals fell from 96.3/85.8/86.1/96.3 (vitest 3) to
        // 88.3/82.2/84.5/90.5 (vitest 4) with no test changes. Floors set just
        // under the new actuals; still stricter than the registry FE (80/70/70/80).
        // Prior peak (vitest 3): 80/85/85/80 (F3+F4, 2026-06-11).
        // lines lowered 88->87 (2026-06-29): the @sethbacon/terraform-suite-ui
        // shim migration relocated tested logic (theme/consent/auth/SuiteSwitcher)
        // into the package, so app-level line coverage trends down as code moves out.
        statements: 85,
        branches: 80,
        functions: 82,
        lines: 87,
      },
    },
  },
})
