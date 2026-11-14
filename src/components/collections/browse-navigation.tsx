'use client';
// Filter and sort changes on browse pages (collections, search).
// They run as a React transition, so the grid can dim while the next page loads.
import NextLink from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {createContext, useCallback, useContext, useMemo, useTransition, type ComponentProps, type ReactNode} from 'react';

type BrowseNav = {isPending: boolean; go: (href: string) => void};
const BrowseNavContext = createContext<BrowseNav | null>(null);

export function BrowseNavigationProvider({children}: {children: ReactNode}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const go = useCallback(
    (href: string) => startTransition(() => router.push(href, {scroll: false})),
    [router],
  );
  const value = useMemo(() => ({isPending, go}), [isPending, go]);
  return <BrowseNavContext.Provider value={value}>{children}</BrowseNavContext.Provider>;
}

/** Navigate to a browse URL. Relative "?…" hrefs stay on the current page. */
export function useBrowseNavigation(): BrowseNav {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const ctx = useContext(BrowseNavContext);
  const resolve = useCallback((href: string) => (href.startsWith('?') ? `${pathname}${href}` : href), [pathname]);
  return useMemo(
    () =>
      ctx
        ? {isPending: ctx.isPending, go: (href: string) => ctx.go(resolve(href))}
        : {isPending: false, go: (href: string) => router.push(resolve(href), {scroll: false})},
    [ctx, resolve, router],
  );
}

/** A link that changes filters/sort without scrolling, inside the browse transition. */
export function BrowseLink({href, onClick, ...props}: Omit<ComponentProps<typeof NextLink>, 'href'> & {href: string}) {
  const {go} = useBrowseNavigation();
  return (
    <NextLink
      href={href}
      scroll={false}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        go(href);
      }}
      {...props}
    />
  );
}
