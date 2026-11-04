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
				'transformers.spec.ts',
				'network.spec.ts',
				'covers.spec.ts',
				'design-policy.spec.ts',
				'branding.spec.ts',
				'graph.spec.ts',
				'security.spec.ts',
				'visual.spec.ts',
				'temperature.spec.ts',
				'painting.spec.ts',
				'virus-article.spec.ts',
			],
		},
		{
			name: 'content',
			testMatch: [
				'content.spec.ts',
				'design-policy.spec.ts',
				'reader.spec.ts',
				'temperature-fixture.spec.ts',
				'comparison-fixture.spec.ts',
				'i18n.spec.ts',
			],
		},
		{
			name: 'contact',
			testMatch: ['contact.spec.ts'],
		},
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
