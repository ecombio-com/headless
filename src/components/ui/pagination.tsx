'use client';
// Cursor pagination link (?cursor=…&direction=next|previous) for Storefront API connections.
import Link from 'next/link';
import {usePathname, useSearchParams} from 'next/navigation';
import type {ReactNode} from 'react';

export function PaginationLink({
  cursor,
  direction,
  children,
  className,
}: {
  cursor?: string | null;
  direction: 'next' | 'previous';
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname() ?? '/';
  const sp = new URLSearchParams(useSearchParams()?.toString() ?? '');
  if (cursor) sp.set('cursor', cursor);
  sp.set('direction', direction);
  return (
    <Link href={`${pathname}?${sp}`} scroll={false} className={className}>
      {children}
    </Link>
  );
}
