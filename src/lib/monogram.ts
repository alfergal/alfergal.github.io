/**
 * The lettering is vector outline geometry generated from Caladea Italic,
 * Copyright 2012 The Caladea Project Authors, SIL Open Font License 1.1.
 * Caladea is a licensed open serif substitution, not Cambria. The font file
 * itself is never shipped. Upstream: https://github.com/googlefonts/caladea
 */
export const monogram = {
	viewBox: '28 8 56 56',
	letterPaths: [
		'M40 161Q40 249 68.5 321.0Q97 393 149.0 435.0Q201 477 267 477Q320 477 376 451Q399 476 427 476Q443 476 458 474Q427 281 427 283Q394 93 394 77Q394 62 413 62Q425 62 440.5 68.5Q456 75 466 81L476 49Q453 29 420.0 11.0Q387 -7 358 -7Q306 -7 306 41Q306 58 314 98Q243 -7 165 -7Q102 -7 71.0 34.0Q40 75 40 161ZM343 301 360 405Q323 429 287 429Q241 429 205.0 389.5Q169 350 149.0 287.5Q129 225 129 161Q129 103 146.0 74.0Q163 45 191 45Q218 45 249.0 77.0Q280 109 305.5 167.5Q331 226 343 301Z',
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
