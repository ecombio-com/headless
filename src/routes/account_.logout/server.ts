// Ported from ($locale).account_.logout.tsx by scripts/split-route.mjs.
import {redirect} from '~/compat/router';
import type {Route} from '~/server/route-types';


// if we don't implement this, /account/logout will get caught by account.$.tsx to do login
export async function loader() {
  return redirect('/');
}

export async function action({context}: Route.ActionArgs) {
  return context.customerAccount.logout();
}
