'use client';
// Ported from ($locale).policies._index.tsx by scripts/split-route.mjs.
import type {loader} from './server';
import {useLoaderData, Link} from '~/compat/router';
import type {Route} from '~/server/route-types';


export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();

  return (
    <div className="policies">
      <h1>Policies</h1>
      <div>
        {policies.map((policy) => (
          <fieldset key={policy.id}>
            <Link to={`/policies/${policy.handle}`}>{policy.title}</Link>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
