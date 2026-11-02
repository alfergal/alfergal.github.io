// Provisional palette. Replace these four values when the final Pantones arrive.
// CSS, syntax highlighting, favicons and the social image share this source.
export const palette = {
	background: '#080F26',
	blue: '#A9D6F5',
	pink: '#F2A7C6',
	white: '#F8FAFF',
} as const;

export const themeVariables = `:root{${Object.entries(palette)
	.map(([name, value]) => `--palette-${name}:${value}`)
	.join(';')}}`;

export const syntaxTheme = {
	name: 'alfergal-midnight',
	type: 'dark' as const,
	colors: {
		'editor.background': palette.background,
		'editor.foreground': palette.white,
	},
	tokenColors: [
		{
			scope: ['comment', 'punctuation.definition.comment'],
			settings: { foreground: palette.blue, fontStyle: 'italic' },
		},
		{
			scope: ['keyword', 'storage', 'constant.language'],
			settings: { foreground: palette.pink },
		},
		{
			scope: [
				'string',
				'constant.numeric',
				'entity.name.function',
				'support.function',
				'entity.name.type',
			],
			settings: { foreground: palette.blue },
		},
	],
};
