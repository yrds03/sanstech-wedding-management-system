import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:180_000,
 expect:{timeout:30_000},
 use:{baseURL:'http://localhost:3100',trace:'retain-on-failure',...devices['Desktop Chrome']},
 webServer:{command:'npm run dev -- --port 3100',url:'http://localhost:3100',reuseExistingServer:false,timeout:120_000,
  env:{LOCAL_DEMO_MODE:'true',NEXT_PUBLIC_APP_URL:'http://localhost:3100',DRIVE_GATEWAY_URL:'disabled-local-test',DRIVE_GATEWAY_SECRET:'disabled',DRIVE_ENCRYPTION_KEY:'disabled',
   GOOGLE_AUTH_SCRIPT_URL:'disabled-local-test',GOOGLE_AUTH_SCRIPT_ID:'disabled',GOOGLE_CLIENT_ID:'disabled',GOOGLE_CLIENT_SECRET:'disabled'}},
});
