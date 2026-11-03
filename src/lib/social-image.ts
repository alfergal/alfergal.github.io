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
<g transform="translate(1026 96) scale(1.5)" color="${palette.white}">${monogramMarkup}</g>
<path d="M70 80h1060M70 550h1060" stroke="${palette.blue}"/>
<text x="65" y="265" font-family="Cambria,Caladea,Georgia,serif" font-size="90" letter-spacing="-4" fill="${palette.white}">${xml(profile.givenName)}</text>
<text x="65" y="360" font-family="Cambria,Caladea,Georgia,serif" font-size="76" letter-spacing="-3" fill="${palette.white}">${xml(profile.familyName)}</text>
<text x="70" y="435" font-family="Cambria,Caladea,Georgia,serif" font-size="27" fill="${palette.pink}">${xml(profile.role)}</text>
<text x="70" y="590" font-family="Cambria,Caladea,Georgia,serif" font-size="16" fill="${palette.blue}">${xml(new URL(profile.site).hostname)}</text>
<g stroke="${palette.blue}" fill="none" opacity=".65"><path d="M900 190 1030 220 1080 370 950 410 850 300 900 190 950 410 1030 220 850 300 1080 370"/><circle cx="900" cy="190" r="9" fill="${palette.blue}"/><circle cx="1030" cy="220" r="6" fill="${palette.pink}"/><circle cx="1080" cy="370" r="11" fill="${palette.blue}"/><circle cx="950" cy="410" r="7" fill="${palette.pink}"/><circle cx="850" cy="300" r="5" fill="${palette.blue}"/><circle cx="1030" cy="220" r="20" stroke="${palette.pink}" stroke-dasharray="3 4"/></g></svg>`;
