import {useSiteOptional} from '~/components/layout/site-context';

// Brand display name from the storefront config (served by the root loader).
export function useBrandName(fallback = 'BicycleBio'): string {
  const root = useSiteOptional();
  return root?.brandName ?? fallback;
}
