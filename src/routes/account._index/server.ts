// Ported from ($locale).account._index.tsx by scripts/split-route.mjs.
import {redirect} from '~/compat/router';
import type {Route} from '~/server/route-types';


export function loader({params}: Route.LoaderArgs) {
  const prefix = params.locale ? `/${params.locale}` : '';
  return redirect(`${prefix}/account/profile`);
}
