// Data endpoint for the client shim: /api/rr/<page path> runs that page's loader (GET) or action (POST).
import {ROUTES} from '~/server/registry';
import {dataEndpoint} from '~/server/resource';

function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '*') {
      params['*'] = s.slice(i).join('/');
      return params;
    }
    if (s[i] === undefined) return null;
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return p.length === s.length ? params : null;
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/rr/, '') || '/';
  for (const [pattern, load] of ROUTES) {
    const params = match(pattern, path);
    if (!params) continue;
    // The loader/action sees the page URL, as it did in Hydrogen.
    const pageRequest = new Request(new URL(path + url.search, url.origin), {
      method: request.method,
      headers: request.headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    });
    return dataEndpoint(await load(), pageRequest, params);
  }
  return Response.json({data: null, status: 404}, {status: 404});
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
