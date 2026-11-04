import { palette } from '../data/theme';
import { monogram, faviconMarkup } from './monogram';

// Same Caladea Italic letter contours, with a larger, simpler four-node graph.
export const favicon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="' +
	monogram.viewBoxFavicon +
	'" color="' +
	palette.white +
	'"><rect width="64" height="64" rx="9" fill="' +
	palette.background +
	'"/>' +
	faviconMarkup +
	'</svg>';
