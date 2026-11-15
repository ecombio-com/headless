// Ported from ($locale).[sitemap.xml].tsx by scripts/split-route.mjs.
import type {Route} from '~/server/route-types';
import {getSitemapIndex} from '~/compat/hydrogen.server';
import {formatSitemapResponse} from '~/lib/sitemap-format';


export async function loader({
  request,
  context: {storefront},
}: Route.LoaderArgs) {
  const response = await getSitemapIndex({
    storefront,
    request,
  });

  return formatSitemapResponse(response);
}
