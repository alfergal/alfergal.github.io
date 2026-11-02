import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { favicon } from '../lib/favicon';

export const GET: APIRoute = async () => {
	const image = await sharp(Buffer.from(favicon))
		.resize(32, 32)
		.png()
		.toBuffer();
	return new Response(new Uint8Array(image), {
		headers: { 'Content-Type': 'image/png' },
	});
};
