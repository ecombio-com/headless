// Ported from ($locale).checkout._index.tsx by scripts/split-route.mjs.
import {redirect} from '~/compat/router';


export async function loader() {
  return redirect('/address');
}
