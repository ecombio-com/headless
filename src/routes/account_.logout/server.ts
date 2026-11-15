// Sign out of Better Auth (clears the shared .<brand>.com session cookie), then return to the shop home. No Shopify logout.
import type {Route} from '~/server/route-types';
import {getAuth} from '~/server/auth';
import {getAuthHosts} from '~/server/auth/hosts';

async function signOutAndGoHome(request: Request) {
  const out = new Response(null, {status: 302, headers: {Location: `${getAuthHosts(request.url).shopOrigin}/`}});
  try {
    const res = await getAuth(request.url).api.signOut({headers: request.headers, asResponse: true});
    for (const c of res.headers.getSetCookie()) out.headers.append('set-cookie', c);
  } catch {
    // No session or auth not configured: just go home.
  }
  return out;
}

export async function loader({request}: Route.LoaderArgs) {
  return Response.redirect(`${getAuthHosts(request.url).shopOrigin}/`, 302);
}

export async function action({request}: Route.LoaderArgs) {
  return signOutAndGoHome(request);
}