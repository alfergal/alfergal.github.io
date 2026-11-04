/**
 * α uses the Tinos Italic Greek alpha outline, SIL Open Font License 1.1,
 * Copyright 2026 The Tinos Project Authors. Its contours are optically fitted
 * to the former a's bounds. f is the original Caladea Italic outline,
 * Copyright 2012 The Caladea Project Authors, SIL Open Font License 1.1.
 * Neither font file is shipped. Tinos: https://github.com/googlefonts/tinos
 * Caladea: https://github.com/googlefonts/caladea. Cambria is unavailable here.
 */
export const monogram = {
	characters: 'αf',
	viewBox: '28 8 56 56',
	letterPaths: [
		'M414.43 25.36 411.1 3.3H322.48Q315.41 25.86 309.59 61.41Q303.76 96.96 302.52 127.36Q268.82 53.32 235.33 23.16Q201.84 -7 155.24 -7Q102.4 -7 71.2 41.55Q40 90.09 40 173.46Q40 229.85 53.31 287.72Q66.63 345.58 93.46 388.98Q120.29 432.38 157.74 454.69Q195.18 477 240.11 477Q335.38 477 351.61 348.03L352.02 333.81 357.85 348.52 410.68 464.25H476L472.67 444.64Q456.86 423.06 434.19 381.87Q411.52 340.68 357.02 234.26Q360.34 158.75 367.62 111.92Q374.9 65.09 386.55 32.72ZM307.92 283.79Q307.92 365.19 291.49 401.48Q275.06 437.77 240.53 437.77Q201.42 437.77 173.55 401.48Q145.67 365.19 129.45 291.64Q113.22 218.08 113.22 158.26Q113.22 104.32 129.24 72.93Q145.26 41.55 173.96 41.55Q208.49 41.55 239.69 80.29Q270.9 119.03 307.51 215.63L307.92 255.35Z',
		'M-144 -142Q-144 -110 -126.5 -93.0Q-109 -76 -85 -76Q-68 -76 -54.5 -85.5Q-41 -95 -37 -112Q-45 -116 -49.5 -125.0Q-54 -134 -54 -143Q-54 -155 -47.0 -163.0Q-40 -171 -27 -171Q-3 -171 11.0 -153.5Q25 -136 33 -102Q38 -80 41.5 -50.0Q45 -20 46 -10Q53 50 56 70L111 413H37L43 447Q90 456 119 467L128 513Q146 607 188.0 652.0Q230 697 298 697Q344 697 375.0 673.0Q406 649 406 613Q406 580 387.0 560.0Q368 540 344 540Q329 540 316.5 549.0Q304 558 299 576Q310 583 316.5 594.0Q323 605 323 617Q323 631 311.5 640.5Q300 650 279 650Q247 650 227.5 620.5Q208 591 208 542Q208 521 208.5 509.5Q209 498 209 491Q209 474 206 462H300L293 413H196L140 59Q127 -26 112.0 -80.5Q97 -135 59.0 -177.0Q21 -219 -46 -219Q-89 -219 -116.5 -198.0Q-144 -177 -144 -142Z',
	] as const,
	letterTransform: 'translate(31.014 50) scale(.052 -.052)',
	viewBoxFavicon: '0 0 64 64',
	letterTransformFavicon: 'translate(9.975 43) scale(.05 -.05)',
} as const;

const lettering = (transform: string) =>
	'<g class="af-logo-letters" fill="currentColor" transform="' +
	transform +
	'"><path d="' +
	monogram.letterPaths[0] +
	'"/><path transform="translate(515 0)" d="' +
	monogram.letterPaths[1] +
	'"/></g>';

export const monogramMarkup = lettering(monogram.letterTransform);
export const faviconMarkup = lettering(monogram.letterTransformFavicon);
