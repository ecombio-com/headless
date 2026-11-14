'use client';
import NextLink from 'next/link';
import type {ComponentProps} from 'react';
import {useUrlLocale} from '~/components/ui/locale-context';

type LocalizedLinkProps = Omit<ComponentProps<typeof NextLink>, 'href' | 'prefetch'> & {
  href: string;
  /** 'none' turns prefetching off (kept for the Hydrogen-era call sites). */
  prefetch?: boolean | 'none' | 'intent';
  /** Keep the scroll position (same as next/link scroll={false}). */
  preventScrollReset?: boolean;
};

export function withLocale(href: string, locale: string | null): string {
  if (!locale || !href.startsWith('/') || href.startsWith('//')) return href;
  const prefix = `/${locale}`;
  if (href === prefix || /^\/[a-z]{2}-[a-z]{2}(\/|\?|#|$)/i.test(href)) return href;
  return href === '/' ? prefix : `${prefix}${href}`;
}

// Prefixes internal hrefs with the URL locale (/en-us).
export default function LocalizedLink({href, prefetch, preventScrollReset, ...props}: LocalizedLinkProps) {
  const locale = useUrlLocale();
  return (
    <NextLink
      href={withLocale(href, locale)}
      prefetch={prefetch === 'none' ? false : prefetch === 'intent' ? undefined : prefetch}
      scroll={preventScrollReset ? false : props.scroll}
      {...props}
    />
  );
}
