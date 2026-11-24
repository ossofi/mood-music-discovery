import { defineConfig, devices } from '@playwright/test';

// PW_CHROME=1 uses the Chrome installed on the machine instead of the downloaded Chromium.
const useSystemChrome = process.env.PW_CHROME === '1';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  webServer: {
    command: 'VITE_API_MOCK=true npm run dev -- --host 127.0.0.1',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /responsive\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], ...(useSystemChrome ? { channel: 'chrome' } : {}) },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], ...(useSystemChrome ? { channel: 'chrome' } : {}) },
      testMatch: /responsive\.spec\.ts/,
    },
  ],
});
