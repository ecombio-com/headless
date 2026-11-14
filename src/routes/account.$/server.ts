// Ported from ($locale).account.$.tsx by scripts/split-route.mjs.
import {redirect} from '~/compat/router';
import type {Route} from '~/server/route-types';


// fallback wild card for all unauthenticated routes in account section
export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();

  return redirect('/account');
}
