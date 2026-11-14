'use client';
// Client-side stand-ins for the react-router APIs the ported components use.
// Temporary seam: new code should use next/link and next/navigation directly.
import NextLink from 'next/link';
import {useSiteOptional} from '~/components/layout/site-context';
import {usePathname, useRouter, useSearchParams as useNextSearchParams, useParams as useNextParams} from 'next/navigation';
import {
  Component,
  createContext,
  forwardRef,
  Suspense,
  use,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type FormEvent,
  type FormHTMLAttributes,
  type ReactNode,
} from 'react';

/* ------------------------------------------------------------------ route data */

type RouteData = {root?: unknown; data?: unknown; actionData?: unknown; outlet?: unknown};
const RouteDataContext = createContext<RouteData>({});

export function RouteDataProvider({data, outlet, children}: {data: unknown; outlet?: unknown; children: ReactNode}) {
  const [actionData, setActionData] = useActionStore();
  void setActionData;
  return <RouteDataContext.Provider value={{data, actionData, outlet}}>{children}</RouteDataContext.Provider>;
}

// What a loader/action resolves to on the client: Responses are handled by the server, data() is unwrapped.
type Unwrap<V> = V extends Response ? never : V extends {__rrData: true; data: infer D} ? D : V;
export type SerializeFrom<T> = T extends (...args: any[]) => any ? Unwrap<Awaited<ReturnType<T>>> : T;

export function useLoaderData<T = any>(): SerializeFrom<T> {
  return useContext(RouteDataContext).data as any;
}
// 'root' data now lives in the site context.
export function useRouteLoaderData<T = any>(id: string): SerializeFrom<T> | undefined {
  const root = useSiteOptional();
  return (id === 'root' ? root : undefined) as any;
}
export function useActionData<T = any>(): SerializeFrom<T> | undefined {
  return useContext(RouteDataContext).actionData as any;
}
const OutletElementContext = createContext<ReactNode>(null);
const OutletDataContext = createContext<unknown>(undefined);

/** Used by a layout page: what <Outlet/> renders inside it. */
export function OutletProvider({element, children}: {element: ReactNode; children: ReactNode}) {
  return <OutletElementContext.Provider value={element}>{children}</OutletElementContext.Provider>;
}
export function Outlet({context}: {context?: unknown}) {
  const element = useContext(OutletElementContext);
  return <OutletDataContext.Provider value={context}>{element}</OutletDataContext.Provider>;
}
export function useOutletContext<T = any>(): T {
  return useContext(OutletDataContext) as T;
}
export function useMatches() {
  const root = useSiteOptional();
  const route = useContext(RouteDataContext);
  return [{id: 'root', data: root}, {id: 'route', data: route.data}];
}

// The last action result for the page (Form posts set it).
let actionValue: unknown;
const actionListeners = new Set<() => void>();
function setActionValue(value: unknown) {
  actionValue = value;
  actionListeners.forEach((l) => l());
}
function useActionStore(): [unknown, (v: unknown) => void] {
  const value = useSyncExternalStore(
    (l) => (actionListeners.add(l), () => actionListeners.delete(l)),
    () => actionValue,
    () => undefined,
  );
  return [value, setActionValue];
}

/* ------------------------------------------------------------------ location */

export type Location = {pathname: string; search: string; hash: string; state: unknown; key: string};

export function useLocation(): Location {
  const pathname = usePathname() ?? '/';
  const sp = useNextSearchParams();
  const search = sp && sp.toString() ? `?${sp.toString()}` : '';
  return useMemo(
    () => ({pathname, search, hash: typeof window === 'undefined' ? '' : window.location.hash, state: null, key: pathname + search}),
    [pathname, search],
  );
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return (useNextParams() ?? {}) as T;
}

type NavigateOptions = {replace?: boolean; preventScrollReset?: boolean; state?: unknown};
export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to: string | number | {pathname?: string; search?: string; hash?: string}, opts: NavigateOptions = {}) => {
      if (typeof to === 'number') return window.history.go(to);
      const href = typeof to === 'string' ? to : `${to.pathname ?? ''}${to.search ?? ''}${to.hash ?? ''}`;
      if (opts.replace) router.replace(href, {scroll: !opts.preventScrollReset});
      else router.push(href, {scroll: !opts.preventScrollReset});
    },
    [router],
  );
}

export function useSearchParams(): [URLSearchParams, (next: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams), opts?: NavigateOptions) => void] {
  const sp = useNextSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const params = useMemo(() => new URLSearchParams(sp?.toString() ?? ''), [sp]);
  const set = useCallback(
    (next: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams), opts: NavigateOptions = {}) => {
      const value = typeof next === 'function' ? next(new URLSearchParams(params)) : new URLSearchParams(next as Record<string, string>);
      const qs = value.toString();
      const href = `${pathname}${qs ? `?${qs}` : ''}`;
      if (opts.replace) router.replace(href, {scroll: !opts.preventScrollReset});
      else router.push(href, {scroll: !opts.preventScrollReset});
    },
    [params, pathname, router],
  );
  return [params, set];
}

export function useRevalidator() {
  const router = useRouter();
  return {revalidate: () => router.refresh(), state: 'idle' as const};
}

export function useNavigation(): {state: 'idle' | 'loading' | 'submitting'; location?: Location; formData?: FormData} {
  const fetchers = useFetchers();
  const pageSubmit = fetchers.find((f) => f.key === PAGE_FORM_KEY && f.state !== 'idle');
  return pageSubmit ? {state: pageSubmit.state, formData: pageSubmit.formData} : {state: 'idle'};
}

/* ------------------------------------------------------------------ Link */

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: string | {pathname?: string; search?: string; hash?: string};
  prefetch?: 'intent' | 'render' | 'viewport' | 'none';
  reloadDocument?: boolean;
  replace?: boolean;
  preventScrollReset?: boolean;
  state?: unknown;
  viewTransition?: boolean;
  discover?: string;
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {to, prefetch, reloadDocument, replace, preventScrollReset, state: _state, viewTransition: _vt, discover: _d, ...rest},
  ref,
) {
  const href = typeof to === 'string' ? to : `${to.pathname ?? ''}${to.search ?? ''}${to.hash ?? ''}`;
  if (reloadDocument || /^(https?:|mailto:|tel:)/.test(href)) {
    return <a ref={ref} href={href} {...rest} />;
  }
  return (
    <NextLink
      ref={ref}
      href={href}
      prefetch={prefetch === 'none' ? false : prefetch === 'render' || prefetch === 'viewport' ? true : null}
      replace={replace}
      scroll={!preventScrollReset}
      {...rest}
    />
  );
});
export const NavLink = Link;

/* ------------------------------------------------------------------ fetchers */

export type FetcherState = 'idle' | 'loading' | 'submitting';
type FetcherRecord = {
  key: string;
  state: FetcherState;
  data: unknown;
  formData?: FormData;
  formAction?: string;
  formMethod?: string;
};

const PAGE_FORM_KEY = '__page_form__';
const fetchers = new Map<string, FetcherRecord>();
const fetcherListeners = new Set<() => void>();
let fetcherSnapshot: FetcherRecord[] = [];
function setFetcher(key: string, patch: Partial<FetcherRecord>) {
  const prev = fetchers.get(key) ?? {key, state: 'idle' as const, data: undefined};
  fetchers.set(key, {...prev, ...patch, key});
  fetcherSnapshot = [...fetchers.values()];
  fetcherListeners.forEach((l) => l());
}
function subscribeFetchers(l: () => void) {
  fetcherListeners.add(l);
  return () => fetcherListeners.delete(l);
}

export function useFetchers(): FetcherRecord[] {
  return useSyncExternalStore(subscribeFetchers, () => fetcherSnapshot, () => fetcherSnapshot);
}

/** Maps a page path (/en-us/cart) to the data endpoint that runs that route's loader/action. */
export function toDataUrl(path: string): string {
  const url = new URL(path, typeof window === 'undefined' ? 'http://localhost' : window.location.href);
  let pathname = url.pathname;
  // Hydrogen paths may omit the locale (/cart); pages always have one here.
  if (!/^\/[a-z]{2}-[a-z]{2}(\/|$)/i.test(pathname) && !/^\/(api|sitemap)(\/|$|\.)/.test(pathname)) {
    const current = typeof window === 'undefined' ? null : /^\/([a-z]{2}-[a-z]{2})(\/|$)/i.exec(window.location.pathname)?.[1];
    pathname = `/${current ?? 'en-us'}${pathname === '/' ? '' : pathname}`;
  }
  return `/api/rr${pathname}${url.search}`;
}

type Envelope = {data?: unknown; redirect?: string; status?: number};

async function callRoute(path: string, init: RequestInit): Promise<Envelope> {
  const res = await fetch(toDataUrl(path), {...init, headers: {...(init.headers ?? {}), Accept: 'application/json'}});
  const text = await res.text();
  try {
    return JSON.parse(text) as Envelope;
  } catch {
    return {data: text, status: res.status};
  }
}

type SubmitTarget = FormData | URLSearchParams | HTMLFormElement | Record<string, unknown> | null;
type SubmitOptions = {method?: string; action?: string; encType?: string; replace?: boolean; preventScrollReset?: boolean};

function toFormData(target: SubmitTarget): FormData {
  if (!target) return new FormData();
  if (target instanceof FormData) return target;
  if (typeof HTMLFormElement !== 'undefined' && target instanceof HTMLFormElement) return new FormData(target);
  const fd = new FormData();
  const entries = target instanceof URLSearchParams ? [...target.entries()] : Object.entries(target);
  for (const [k, v] of entries) fd.append(k, typeof v === 'string' || v instanceof Blob ? v : JSON.stringify(v));
  return fd;
}

function useSubmitter(key: string) {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    async (target: SubmitTarget, opts: SubmitOptions = {}) => {
      const method = (opts.method ?? 'get').toUpperCase();
      const action = opts.action ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : pathname);
      const formData = toFormData(target);
      if (method === 'GET') {
        const qs = new URLSearchParams(formData as unknown as Record<string, string>).toString();
        const href = `${action.split('?')[0]}${qs ? `?${qs}` : ''}`;
        if (key === PAGE_FORM_KEY) {
          router.push(href, {scroll: !opts.preventScrollReset});
          return;
        }
        return load(key, href);
      }
      setFetcher(key, {state: 'submitting', formData, formAction: action, formMethod: method});
      try {
        const body =
          opts.encType === 'application/json'
            ? JSON.stringify(Object.fromEntries(formData))
            : formData;
        const result = await callRoute(action, {
          method,
          body,
          headers: opts.encType === 'application/json' ? {'Content-Type': 'application/json'} : undefined,
        });
        setFetcher(key, {state: 'loading', data: result.data});
        if (key === PAGE_FORM_KEY) setActionValue(result.data);
        if (result.redirect) {
          if (/^https?:/.test(result.redirect)) window.location.href = result.redirect;
          else router.push(result.redirect);
        } else {
          router.refresh(); // revalidate server data, like a react-router action
        }
      } finally {
        setFetcher(key, {state: 'idle', formData: undefined});
      }
    },
    [key, pathname, router],
  );
}

async function load(key: string, href: string) {
  setFetcher(key, {state: 'loading', formAction: href, formMethod: 'GET'});
  try {
    const result = await callRoute(href, {method: 'GET'});
    setFetcher(key, {data: result.data});
  } finally {
    setFetcher(key, {state: 'idle'});
  }
}

export type FormProps = Omit<FormHTMLAttributes<HTMLFormElement>, 'method' | 'action'> & {
  method?: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  action?: string;
  replace?: boolean;
  preventScrollReset?: boolean;
  navigate?: boolean;
  fetcherKey?: string;
  reloadDocument?: boolean;
  viewTransition?: boolean;
  discover?: string;
};

function makeForm(useKey: () => string) {
  return forwardRef<HTMLFormElement, FormProps>(function Form(
    {method = 'get', action, replace, preventScrollReset, navigate: _n, fetcherKey: _fk, reloadDocument, viewTransition: _vt, discover: _d, onSubmit, children, ...rest},
    ref,
  ) {
    const key = useKey();
    const submit = useSubmitter(key);
    const handle = (e: FormEvent<HTMLFormElement>) => {
      onSubmit?.(e as never);
      if (e.defaultPrevented || reloadDocument) return;
      e.preventDefault();
      const native = e.nativeEvent as unknown as {submitter?: HTMLElement | null};
      const fd = new FormData(e.currentTarget, native.submitter ?? undefined);
      void submit(fd, {method, action, encType: rest.encType, replace, preventScrollReset});
    };
    return (
      <form ref={ref} method={method.toLowerCase() === 'get' ? 'get' : 'post'} action={action} onSubmit={handle} {...rest}>
        {children}
      </form>
    );
  });
}

export const Form = makeForm(() => PAGE_FORM_KEY);

export function useSubmit() {
  return useSubmitter(PAGE_FORM_KEY);
}

export type Fetcher<T = any> = FetcherWithComponents<T>;
export type FetcherWithComponents<T = any> = {
  key: string;
  state: FetcherState;
  data: T | undefined;
  formData?: FormData;
  formAction?: string;
  formMethod?: string;
  Form: ReturnType<typeof makeForm>;
  submit: (target: SubmitTarget, opts?: SubmitOptions) => Promise<void>;
  load: (href: string) => Promise<void>;
};

export function useFetcher<T = any>({key: givenKey}: {key?: string} = {}): FetcherWithComponents<T> {
  const autoKey = useId();
  const key = givenKey ?? autoKey;
  const keyRef = useRef(key);
  keyRef.current = key;
  const all = useFetchers();
  const record = all.find((f) => f.key === key);
  const submit = useSubmitter(key);
  const FormRef = useRef<ReturnType<typeof makeForm> | null>(null);
  if (!FormRef.current) FormRef.current = makeForm(() => keyRef.current);
  useEffect(() => () => {
    if (!givenKey) fetchers.delete(key);
  }, [givenKey, key]);
  return {
    key,
    state: record?.state ?? 'idle',
    data: record?.data as T | undefined,
    formData: record?.formData,
    formAction: record?.formAction,
    formMethod: record?.formMethod,
    Form: FormRef.current,
    submit: submit as FetcherWithComponents<T>['submit'],
    load: (href: string) => load(key, href),
  };
}

/* ------------------------------------------------------------------ Await */

const AsyncValueContext = createContext<unknown>(undefined);
export function useAsyncValue<T = unknown>(): T {
  return useContext(AsyncValueContext) as T;
}

class AwaitBoundary extends Component<{fallback: ReactNode; children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {
    return {failed: true};
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Resolve<T>({resolve, children}: {resolve: T | Promise<T>; children: ReactNode | ((value: T) => ReactNode)}) {
  const value = resolve instanceof Promise || (resolve && typeof (resolve as any).then === 'function') ? use(resolve as Promise<T>) : (resolve as T);
  return (
    <AsyncValueContext.Provider value={value}>
      {typeof children === 'function' ? (children as (v: T) => ReactNode)(value) : children}
    </AsyncValueContext.Provider>
  );
}

export function Await<T>({
  resolve,
  errorElement,
  children,
}: {
  resolve: T | Promise<T>;
  errorElement?: ReactNode;
  children: ReactNode | ((value: Awaited<T>) => ReactNode);
}) {
  return (
    <AwaitBoundary fallback={errorElement ?? null}>
      <Resolve resolve={resolve as any}>{children as any}</Resolve>
    </AwaitBoundary>
  );
}


/* ------------------------------------------------------------------ misc */

export function ScrollRestoration() {
  return null;
}
