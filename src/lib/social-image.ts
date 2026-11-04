import { palette } from '../data/theme';
import { profile } from '../data/profile';
import { monogramMarkup } from './monogram';
const xml = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
// The static social image shares the interface palette and public profile.
export const socialImage = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${palette.background}"/>
<g transform="translate(840 190) scale(2.25)">${monogramMarkup}</g>
<text x="65" y="265" font-family="Cambria,Caladea,Georgia,serif" font-size="90" letter-spacing="-4" fill="${palette.white}">${xml(profile.givenName)}</text>
<text x="65" y="360" font-family="Cambria,Caladea,Georgia,serif" font-size="76" letter-spacing="-3" fill="${palette.white}">${xml(profile.familyName)}</text>
<text x="70" y="435" font-family="Cambria,Caladea,Georgia,serif" font-size="27" fill="${palette.pink}">${xml(profile.role)}</text>
<text x="70" y="590" font-family="Cambria,Caladea,Georgia,serif" font-size="16" fill="${palette.blue}">${xml(new URL(profile.site).hostname)}</text>
</svg>`;
