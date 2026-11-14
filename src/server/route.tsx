// Runs a ported route module (loader + meta) for a Next.js page.
import 'server-only';
import {notFound, redirect} from 'next/navigation';
import type {ComponentType} from 'react';
import {isDataWithInit} from '~/compat/router';
import {OutletProvider, RouteDataProvider} from '~/compat/router.client';
import type {AppContext} from './context';
import {getRequestContext} from './site';
import {Meta, type MetaDescriptor} from './meta';

export type LoaderArgs = {request: Request; params: Record<string, string | undefined>; context: AppContext};
export type MetaArgs = {
  data: any;
  params: Record<string, string | undefined>;
  location: {pathname: string; search: string};
  matches: {id: string; data: unknown}[];
};
export type RouteModule = {
  loader?: (args: LoaderArgs) => unknown;
  action?: (args: LoaderArgs) => unknown;
  meta?: (args: MetaArgs) => MetaDescriptor[] | undefined;
};

/** Turns a thrown/returned Response into Next.js control flow. */
export function handleResponse(res: Response): never {
  const location = res.headers.get('Location');
  if (location && res.status >= 300 && res.status < 400) redirect(location);
  if (res.status === 404) notFound();
  throw new Error(`Route responded ${res.status}`);
}

export async function runLoader(mod: RouteModule, params: Record<string, string | undefined>) {
  const context = await getRequestContext();
  const request = context.request;
  let data: unknown = null;
  try {
    data = mod.loader ? await mod.loader({request, params, context}) : null;
  } catch (error) {
    if (error instanceof Response) handleResponse(error);
    throw error;
  }
  if (data instanceof Response) handleResponse(data);
  if (isDataWithInit(data)) data = data.data;
  return {data, request, context};
}

export async function renderRoute(
  mod: RouteModule,
  View: ComponentType,
  paramsPromise: Promise<Record<string, string | string[] | undefined>>,
) {
  const raw = await paramsPromise;
  const params = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v.join('/') : v]));
  const {data, request, context} = await runLoader(mod, params);
  const url = new URL(request.url);
  const descriptors =
    mod.meta?.({
      data,
      params,
      location: {pathname: url.pathname, search: url.search},
      matches: [{id: 'root', data: {brandName: context.storefrontConfig.name, brand: context.storefrontConfig.brand}}],
    }) ?? [];
  return (
    <>
      <Meta descriptors={descriptors} />
      <RouteDataProvider data={data}>
        <View />
      </RouteDataProvider>
    </>
  );
}

/** A layout route (e.g. account): its view renders <Outlet/> where the child page goes. */
export async function renderLayout(
  mod: RouteModule,
  View: ComponentType,
  paramsPromise: Promise<Record<string, string | string[] | undefined>>,
  children: React.ReactNode,
) {
  const raw = await paramsPromise;
  const params = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v.join('/') : v]));
  const {data} = await runLoader(mod, params);
  return (
    <RouteDataProvider data={data}>
      <OutletProvider element={children}>
        <View />
      </OutletProvider>
    </RouteDataProvider>
  );
}
