import { defineConfig } from '@playwright/test';

// Worker fixtures build isolated copies and own their background servers.
// Use the system browser when CHROME_PATH is supplied, or Playwright Chromium otherwise.
export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	workers: 2,
	timeout: 45_000,
	projects: [
		{
			name: 'site',
			testMatch: [
				'site.spec.ts',
				'graph.spec.ts',
				'security.spec.ts',
				'visual.spec.ts',
			],
		},
		{ name: 'content', testMatch: ['content.spec.ts', 'reader.spec.ts'] },
	],
	use: {
		browserName: 'chromium',
		launchOptions: process.env.CHROME_PATH
			? { executablePath: process.env.CHROME_PATH }
			: {},
		viewport: { width: 1440, height: 1000 },
		colorScheme: 'light',
		trace: { mode: 'retain-on-failure', screenshots: false },
	},
});
