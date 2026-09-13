import { defineConfig } from 'vitest/config';

export default defineConfig({
	// n8n-workflow ships sourcemaps without their sources, which makes Vite noisy
	logLevel: 'error',
	test: {
		environment: 'node',
		include: ['test/**/*.test.ts'],
	},
});
