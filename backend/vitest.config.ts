import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'libs/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/__tests__/**'],
    },
  },
});
