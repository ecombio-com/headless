'use client';
import {usePathname, useSearchParams} from 'next/navigation';

/** Current path and query string (hash isn't sent to the server, so it starts empty). */
export function useCurrentUrl() {
  const pathname = usePathname() ?? '/';
  const qs = useSearchParams()?.toString() ?? '';
  return {pathname, search: qs ? `?${qs}` : '', hash: ''};
}
