// Customer sign-in lives on auth.<brand>.com (specs/001-customer-sign-in). No Shopify login hop.
import type {Route} from '~/server/route-types';
import {signInUrl} from '~/server/auth/hosts';

export async function loader({request}: Route.LoaderArgs) {
  const returnTo = new URL(request.url).searchParams.get('return_to') ?? undefined;
  return Response.redirect(signInUrl(request.url, returnTo), 302);
}