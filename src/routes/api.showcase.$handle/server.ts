// Ported from ($locale).api.showcase.$handle.tsx by scripts/split-route.mjs.
import type {Route} from '~/server/route-types';
import {getShowcaseTabProducts} from '~/lib/home-showcase.server';


export async function loader({context, params}: Route.LoaderArgs) {
  const handle = params.handle ?? '';
  return {handle, products: await getShowcaseTabProducts(context.storefront, handle, context.yotpo)};
}
