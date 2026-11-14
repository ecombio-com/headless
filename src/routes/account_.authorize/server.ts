// Ported from ($locale).account_.authorize.tsx by scripts/split-route.mjs.
import type {Route} from '~/server/route-types';


export async function loader({context}: Route.LoaderArgs) {
  return context.customerAccount.authorize();
}
