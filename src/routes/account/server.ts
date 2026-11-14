// Ported from ($locale).account.tsx by scripts/split-route.mjs.
import {data as remixData} from '~/compat/router';
import type {Route} from '~/server/route-types';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';


export const meta: Route.MetaFunction = () => [
  {title: 'Account'},
  {name: 'robots', content: 'noindex, nofollow'},
];

export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  await customerAccount.handleAuthStatus();
  const {data, errors} = await customerAccount.query(CUSTOMER_DETAILS_QUERY, {
    variables: {
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw new Error('Customer not found');
  }

  return remixData(
    {customer: data.customer},
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}
