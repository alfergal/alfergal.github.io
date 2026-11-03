import { palette } from '../data/theme';
import { monogram, monogramMarkup } from './monogram';

// The same AF geometry as the header; the dark tile works on either browser theme.
export const favicon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="' +
	monogram.viewBox +
	'" color="' +
	palette.white +
	'"><rect width="64" height="64" rx="9" fill="' +
	palette.background +
	'"/>' +
	monogramMarkup +
	'</svg>';
