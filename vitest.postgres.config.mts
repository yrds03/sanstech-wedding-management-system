import {defineConfig} from 'vitest/config';
export default defineConfig({test:{environment:'node',include:['tests/concurrency/**/*.test.ts'],maxWorkers:1,hookTimeout:120_000,testTimeout:30_000}});
