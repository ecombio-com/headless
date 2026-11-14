// react-router stand-in. Server-safe helpers live here; client hooks come from router.client.
// Temporary seam: new code should use next/navigation and plain functions.
export {RouteDataProvider,useLoaderData,useRouteLoaderData,useActionData,useOutletContext,OutletProvider,useMatches,useLocation,useParams,useNavigate,useSearchParams,useRevalidator,useNavigation,Link,NavLink,useFetchers,toDataUrl,Form,useSubmit,useFetcher,useAsyncValue,Await,Outlet,ScrollRestoration} from './router.client';
export {Suspense} from 'react';
export type {Location,FetcherState,FormProps,Fetcher,FetcherWithComponents} from './router.client';

export type LoaderFunctionArgs = {
  request: Request;
  params: Record<string, string | undefined>;
  context: import('~/server/context').AppContext;
};
export type ActionFunctionArgs = LoaderFunctionArgs;
export type HeadersFunction = (args: {actionHeaders: Headers; loaderHeaders: Headers; parentHeaders: Headers}) => HeadersInit;
export type MetaDescriptor = Record<string, unknown>;
export type ShouldRevalidateFunction = (...args: any[]) => boolean;
export type EntryContext = unknown;

export type DataWithResponseInit<T> = {__rrData: true; data: T; init?: ResponseInit};

/** react-router's data(): a value plus status/headers. */
export function data<T>(value: T, init?: number | ResponseInit): DataWithResponseInit<T> {
  return {__rrData: true, data: value, init: typeof init === 'number' ? {status: init} : init};
}
export function isDataWithInit(value: unknown): value is DataWithResponseInit<unknown> {
  return Boolean(value && typeof value === 'object' && '__rrData' in (value as object));
}

export function redirect(url: string, init: number | ResponseInit = 302): Response {
  const base = typeof init === 'number' ? {status: init} : init;
  const headers = new Headers(base.headers);
  headers.set('Location', url);
  return new Response(null, {...base, status: base.status ?? 302, headers});
}
export const redirectDocument = redirect;

export function isRouteErrorResponse(error: unknown): error is {status: number; statusText: string; data: unknown} {
  return Boolean(error && typeof error === 'object' && 'status' in error && 'data' in error);
}
export function useRouteError(): unknown {
  return undefined;
}
