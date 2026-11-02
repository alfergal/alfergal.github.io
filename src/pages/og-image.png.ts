import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { socialImage } from '../lib/social-image';
export const GET: APIRoute = async () => {
	const image = await sharp(Buffer.from(socialImage)).png().toBuffer();
	return new Response(new Uint8Array(image), {
		headers: { 'Content-Type': 'image/png' },
	});
};
