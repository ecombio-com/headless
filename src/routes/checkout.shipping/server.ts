// Ported from ($locale).checkout.shipping.tsx by scripts/split-route.mjs.
import {redirect} from '~/compat/router';
import type {Route} from '~/server/route-types';


// Next had a custom shipping step; Shopify checkout now collects this, so old links land on the cart.
export function loader({params}: Route.LoaderArgs) {
  const prefix = params.locale ? `/${params.locale}` : '';
  return redirect(`${prefix}/cart`, 301);
}
