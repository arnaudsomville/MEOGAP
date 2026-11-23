import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const parsedMinCoverage = Number(process.env.MIN_TEST_COVERAGE ?? 85)
const minCoverage = Number.isFinite(parsedMinCoverage) ? parsedMinCoverage : 85

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    tags: [
      { name: 'unit', description: 'Validates isolated logic and component behavior.' },
      { name: 'contract', description: 'Validates local payloads against the reference contract.' },
      { name: 'functional', description: 'Validates a complete user-visible behavior.' },
      { name: 'integration', description: 'Validates interactions with real services.' },
    ],
    strictTags: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'cobertura'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts'],
      thresholds: {
        lines: minCoverage,
        functions: minCoverage,
        branches: minCoverage,
        statements: minCoverage,
      },
    },
  },
})
