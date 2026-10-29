import { BUILD } from '../build';

export const GET = () => new Response(JSON.stringify({ v: BUILD }));
