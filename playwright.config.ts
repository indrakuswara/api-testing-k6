import { defineConfig, type ReporterDescription } from '@playwright/test';

const reporters: ReporterDescription[] = [
  ['json', { outputFile: 'test-results.json' }],
  ['html', { open: 'never' }],
];

if (process.env.CI) {
  reporters.push(['github']);
} else {
  reporters.push(['list']);
}

export default defineConfig({
  testDir: './api-tests/tests',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: reporters,
  use: {
    baseURL: process.env.API_BASE_URL ?? 'https://api.restful-api.dev',
    extraHTTPHeaders: { Accept: 'application/json' },
  },
});
