import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {},
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    globals: false,
  },
});
