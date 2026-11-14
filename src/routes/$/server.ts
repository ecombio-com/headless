// Ported from ($locale).$.tsx by scripts/split-route.mjs.
import type {Route} from '~/server/route-types';


export async function loader({request}: Route.LoaderArgs) {
  throw new Response(`${new URL(request.url).pathname} not found`, {
    status: 404,
  });
}
