import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './api-tests/tests',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.API_BASE_URL ?? 'https://api.restful-api.dev',
    extraHTTPHeaders: { Accept: 'application/json' },
  },
});
