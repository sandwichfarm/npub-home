import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
	plugins: [svelte({ hot: false })],
	resolve: {
		// 'browser' condition is required so Svelte resolves to the client bundle
		// (index-client.js) rather than the server bundle (index-server.js) in jsdom tests.
		conditions: ['browser'],
		alias: {
			$lib: path.resolve(__dirname, 'src/lib'),
		},
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.ts'],
		globals: true,
		setupFiles: ['src/lib/__tests__/setup.ts'],
	},
});
