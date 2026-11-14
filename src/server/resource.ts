// Runs ported loaders/actions as Next.js Route Handlers, and serves the /api/rr data endpoint
// that the client fetcher shim (useFetcher, CartForm, <Form>) talks to.
import 'server-only';
import {isDataWithInit} from '~/compat/router';
import {createAppContext, type AppContext} from './context';
import type {RouteModule} from './route';

type Params = Record<string, string | undefined>;

async function finish(context: AppContext, res: Response): Promise<Response> {
  const headers = new Headers(res.headers);
  for (const c of context.pendingCookies) headers.append('Set-Cookie', c);
  if (context.session.isPending) headers.append('Set-Cookie', await context.session.commit());
  return new Response(res.body, {status: res.status, statusText: res.statusText, headers});
}

/** Calls loader (GET/HEAD) or action (other methods). Thrown Responses count as results. */
export async function invoke(mod: RouteModule, request: Request, params: Params, context: AppContext): Promise<unknown> {
  const isRead = request.method === 'GET' || request.method === 'HEAD';
  const fn = isRead ? mod.loader : mod.action;
  if (!fn) return new Response('Method Not Allowed', {status: 405});
  try {
    return await fn({request, params, context});
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}

/** Resolves top-level promises (deferred loader data) so the result can be sent as JSON. */
async function settle(value: unknown): Promise<unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const entries = await Promise.all(
    Object.entries(value as Record<string, unknown>).map(async ([k, v]) => [k, v instanceof Promise ? await v.catch(() => null) : v]),
  );
  return Object.fromEntries(entries);
}

/** A loader/action module as a Route Handler (raw Responses pass through). */
export function resourceRoute(mod: RouteModule) {
  const handler = async (request: Request, ctx: {params: Promise<Record<string, string | string[] | undefined>>}) => {
    const raw = (await ctx?.params) ?? {};
    const params = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v.join('/') : v]));
    const context = createAppContext(request);
    const result = await invoke(mod, request, params, context);
    if (result instanceof Response) return finish(context, result);
    if (isDataWithInit(result)) {
      return finish(context, Response.json(await settle(result.data), result.init));
    }
    return finish(context, Response.json(await settle(result)));
  };
  return {GET: handler, POST: handler, PUT: handler, PATCH: handler, DELETE: handler};
}

/** JSON envelope for the client shim: {data} or {redirect}. */
export async function dataEndpoint(mod: RouteModule, request: Request, params: Params): Promise<Response> {
  const context = createAppContext(request);
  const result = await invoke(mod, request, params, context);
  if (result instanceof Response) {
    const location = result.headers.get('Location');
    if (location && result.status >= 300 && result.status < 400) {
      const res = Response.json({redirect: location});
      for (const c of result.headers.getSetCookie()) res.headers.append('Set-Cookie', c);
      return finish(context, res);
    }
    const type = result.headers.get('Content-Type') ?? '';
    const body = type.includes('json') ? await result.json() : await result.text();
    const res = Response.json({data: body, status: result.status}, {status: result.status});
    for (const c of result.headers.getSetCookie()) res.headers.append('Set-Cookie', c);
    return finish(context, res);
  }
  if (isDataWithInit(result)) {
    const init = result.init ?? {};
    const headers = new Headers(init.headers);
    const location = headers.get('Location');
    const res = location ? Response.json({redirect: location}) : Response.json({data: await settle(result.data), status: init.status ?? 200});
    for (const c of headers.getSetCookie()) res.headers.append('Set-Cookie', c);
    return finish(context, res);
  }
  return finish(context, Response.json({data: await settle(result)}));
}
