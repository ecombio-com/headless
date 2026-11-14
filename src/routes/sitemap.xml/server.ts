// Ported from ($locale).[sitemap.xml].tsx by scripts/split-route.mjs.
import type {Route} from '~/server/route-types';
import {getSitemapIndex} from '~/compat/hydrogen.server';


export async function loader({
  request,
  context: {storefront},
}: Route.LoaderArgs) {
  const response = await getSitemapIndex({
    storefront,
    request,
  });

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}
