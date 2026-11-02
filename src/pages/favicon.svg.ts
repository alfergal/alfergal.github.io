import type { APIRoute } from 'astro';
import { favicon } from '../lib/favicon';

export const GET: APIRoute = () =>
	new Response(favicon, {
		headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
	});
