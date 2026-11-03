import type { APIRoute } from 'astro';
import { createFeed } from '../../lib/feed';
export const GET: APIRoute = () => createFeed('en');
