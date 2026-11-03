/** AF on a 64×64 plane, 2-unit module, 4-unit uniform strokes.
 * A: (6,50) → (18,14) → (30,50), slope ±3.
 * F: vertical x=38, top y=14, upper arm ending x=58.
 * Shared bar: y=34, from A's left intersection (34/3) to x=54.
 * Square caps and bevel joins keep the acute apex compact at favicon sizes.
 */
export const monogram = {
	viewBox: '0 0 64 64',
	strokeWidth: 4,
	paths: ['M6 50L18 14L30 50', 'M38 50V14H58', 'M11.333 34H54'],
} as const;

// All consumers inherit colour. No text, fonts, IDs, scripts or filters.
export const monogramMarkup =
	'<g fill="none" stroke="currentColor" stroke-width="' +
	monogram.strokeWidth +
	'" stroke-linecap="square" stroke-linejoin="bevel">' +
	monogram.paths.map((d) => '<path d="' + d + '"/>').join('') +
	'</g>';
