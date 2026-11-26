import {defineConfig, devices} from '@playwright/test';
export default defineConfig({
 testDir: './tests/e2e-drive', fullyParallel: false, workers: 1, timeout: 180_000,
 expect: {timeout: 30_000},
 use: {baseURL: 'http://localhost:3131', trace: 'retain-on-failure', ...devices['Desktop Chrome']},
 webServer: {command: 'node --import ./tests/fixtures/google-services.mjs node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3131',
  url: 'http://localhost:3131/auth/login', reuseExistingServer: false, timeout: 120_000,
  env: {WMS_TEST_GOOGLE: '1', DRIVE_ENCRYPTION_KEY: 'ab'.repeat(32), DRIVE_GATEWAY_URL: 'https://script.google.com/macros/s/local-test/exec',
   DRIVE_GATEWAY_SECRET: 'local-test-only-secret-with-more-than-32-characters', GOOGLE_CLIENT_ID: 'local-test.apps.googleusercontent.com',
   GOOGLE_CLIENT_SECRET: 'local-test-only-client-secret', NEXT_PUBLIC_APP_URL: 'http://localhost:3131', LOCAL_DEMO_MODE: 'false'}},
});
