// Small helper for native App Router pages: one cached loader shared by generateMetadata and the page.
import 'server-only';
import {cache, type ReactNode} from 'react';
import type {Metadata} from 'next';
import type {AppContext} from './context';
import {getRequestContext} from './site';
import {handleResponse} from './route';

type RawParams = Record<string, string | string[] | undefined>;
export type PageArgs<P extends string = string> = {
  params: Record<P, string>;
  searchParams: URLSearchParams;
  context: AppContext;
  request: Request;
};
type NextPageProps = {params: Promise<RawParams>; searchParams?: Promise<RawParams>};

function flat(raw: RawParams): Record<string, string> {
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v.join('/') : (v ?? '')]));
}

export function definePage<D, P extends string = string>(config: {
  load: (args: PageArgs<P>) => Promise<D>;
  metadata?: (data: D, args: PageArgs<P>) => Metadata | Promise<Metadata>;
  render: (data: D, args: PageArgs<P>) => ReactNode;
}) {
  // Keyed by the URL, so generateMetadata and the page share one load per request.
  const loadOnce = cache(async (url: string, params: string) => {
    const context = await getRequestContext();
    const args: PageArgs<P> = {
      params: JSON.parse(params) as Record<P, string>,
      searchParams: new URL(url).searchParams,
      context,
      request: context.request,
    };
    try {
      return {data: await config.load(args), args};
    } catch (error) {
      // Shared helpers may still throw a Response (404 / redirect), Hydrogen-style.
      if (error instanceof Response) handleResponse(error);
      throw error;
    }
  });
  const run = async ({params}: NextPageProps) => {
    const context = await getRequestContext();
    return loadOnce(context.request.url, JSON.stringify(flat(await params)));
  };
  return {
    async generateMetadata(props: NextPageProps): Promise<Metadata> {
      if (!config.metadata) return {};
      const {data, args} = await run(props);
      return config.metadata(data, args);
    },
    async Page(props: NextPageProps) {
      const {data, args} = await run(props);
      return config.render(data, args);
    },
  };
}
