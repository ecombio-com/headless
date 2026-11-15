// Account pages on Better Auth + Shopify Admin API (P1.4.6, specs/001-customer-sign-in).
// Drop-in for the old Customer Account API client: same methods, same data shapes,
// so the account routes and components stay unchanged. Queries are matched by operation name.
import 'server-only';
import {getLocaleFromRequest} from '~/core/config/i18n';
import {getStorefrontConfig} from '~/core/config/storefronts';
import {getAuth} from './index';
import {signInUrl} from './hosts';
import {adminGraphql} from './shopify-admin';

type Env = Record<string, string | undefined>;
type Result = {data: any; errors?: {message: string}[]};
type Opts = {variables?: Record<string, unknown>; language?: string};

const MONEY = 'amount currencyCode';
const ADDRESS = 'id formatted firstName lastName company address1 address2 countryCodeV2 provinceCode city zip phone';
const DISCOUNT_VALUE = `value { __typename ... on MoneyV2 { ${MONEY} } ... on PricingPercentageValue { percentage } }`;

const Q = {
  findCustomer: `query($q: String!) { customers(first: 1, query: $q) { nodes { id } } }`,
  createCustomer: `mutation($input: CustomerInput!) { customerCreate(input: $input) { customer { id } userErrors { field message } } }`,
  details: `query($id: ID!) { customer(id: $id) { id firstName lastName defaultAddress { ${ADDRESS} } addressesV2(first: 6) { nodes { ${ADDRESS} } } } }`,
  orders: `query($q: String!, $first: Int, $last: Int, $after: String, $before: String) {
    orders(first: $first, last: $last, after: $after, before: $before, sortKey: PROCESSED_AT, reverse: true, query: $q) {
      nodes { id number confirmationNumber processedAt displayFinancialStatus displayFulfillmentStatus
        totalPriceSet { shopMoney { ${MONEY} } } fulfillments(first: 1) { status } }
      pageInfo { hasPreviousPage hasNextPage endCursor startCursor }
    } }`,
  order: `query($id: ID!) { order(id: $id) {
    id name confirmationNumber statusPageUrl displayFulfillmentStatus processedAt tags customer { id }
    fulfillments(first: 1) { status }
    totalShippingPriceSet { shopMoney { ${MONEY} } } totalTaxSet { shopMoney { ${MONEY} } }
    totalPriceSet { shopMoney { ${MONEY} } } subtotalPriceSet { shopMoney { ${MONEY} } }
    shippingAddress { name formatted(withName: true) formattedArea }
    discountApplications(first: 100) { nodes { ${DISCOUNT_VALUE} } }
    lineItems(first: 100) { nodes { id title quantity variantTitle
      originalUnitPriceSet { shopMoney { ${MONEY} } } totalDiscountSet { shopMoney { ${MONEY} } }
      discountAllocations { allocatedAmountSet { shopMoney { ${MONEY} } } discountApplication { ${DISCOUNT_VALUE} } }
      image { altText height url id width } } }
  } }`,
  update: `mutation($input: CustomerInput!) { customerUpdate(input: $input) { customer { firstName lastName email phone } userErrors { field message } } }`,
  addressCreate: `mutation($customerId: ID!, $address: MailingAddressInput!, $setAsDefault: Boolean) {
    customerAddressCreate(customerId: $customerId, address: $address, setAsDefault: $setAsDefault) { address { id } userErrors { field message } } }`,
  addressUpdate: `mutation($customerId: ID!, $addressId: ID!, $address: MailingAddressInput!, $setAsDefault: Boolean) {
    customerAddressUpdate(customerId: $customerId, addressId: $addressId, address: $address, setAsDefault: $setAsDefault) { address { id } userErrors { field message } } }`,
  addressDelete: `mutation($customerId: ID!, $addressId: ID!) {
    customerAddressDelete(customerId: $customerId, addressId: $addressId) { deletedAddressId userErrors { field message } } }`,
};

const money = (set?: {shopMoney: {amount: string; currencyCode: string}} | null) => set?.shopMoney ?? null;
const numericId = (gid: string) => gid.split('/').pop()?.split('?')[0] ?? '';
const userErrors = (errs: {field?: string[] | null; message: string}[] = []) => errs.map((e) => ({code: null, field: e.field ?? null, message: e.message}));

function toAddress(a: any) {
  if (!a) return null;
  return {
    id: a.id, formatted: a.formatted, firstName: a.firstName, lastName: a.lastName, company: a.company,
    address1: a.address1, address2: a.address2, territoryCode: a.countryCodeV2, zoneCode: a.provinceCode,
    city: a.city, zip: a.zip, phoneNumber: a.phone,
  };
}

function toMailingInput(a: any = {}) {
  const out: Record<string, unknown> = {
    firstName: a.firstName, lastName: a.lastName, company: a.company, address1: a.address1, address2: a.address2,
    countryCode: a.territoryCode, provinceCode: a.zoneCode, city: a.city, zip: a.zip, phone: a.phoneNumber,
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

function redirectTo(location: string, headers?: Headers) {
  const h = new Headers(headers);
  h.set('Location', location);
  return new Response(null, {status: 302, headers: h});
}

export function createBetterAuthCustomerAccount({env, request}: {env: Env; request: Request}) {
  // Built on first use, so pages that never touch the account don't open the database.
  let authInstance: ReturnType<typeof getAuth> | undefined;
  const A = () => (authInstance ??= getAuth(request.url));
  const locale = getLocaleFromRequest(request);
  const brandTag = `storefront_${getStorefrontConfig(env.PUBLIC_STOREFRONT_ID).slug}`;

  let sessionPromise: Promise<Awaited<ReturnType<ReturnType<typeof getAuth>['api']['getSession']>> | null> | undefined;
  // No session cookie = signed out; skip the database on ordinary page views.
  const hasSessionCookie = /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=/.test(request.headers.get('cookie') ?? '');
  const getSession = () =>
    (sessionPromise ??= hasSessionCookie ? A().api.getSession({headers: request.headers}).catch(() => null) : Promise.resolve(null));

  /** Shopify customer GID for the signed-in user; finds or creates it on first use. */
  async function customerGid(): Promise<string> {
    const session = await getSession();
    if (!session) throw redirectTo(`${locale.pathPrefix}/account/login`);
    const stored = (session.user as {shopifyCustomerId?: string | null}).shopifyCustomerId;
    if (stored) return stored;
    const email = session.user.email;
    const found = await adminGraphql(env, Q.findCustomer, {q: `email:"${email.replace(/"/g, '')}"`});
    let gid: string | undefined = found.customers.nodes[0]?.id;
    if (!gid) {
      const created = await adminGraphql(env, Q.createCustomer, {input: {email}});
      const errs = created.customerCreate.userErrors;
      if (errs.length) throw new Error(`customerCreate: ${errs.map((e: any) => e.message).join('; ')}`);
      gid = created.customerCreate.customer.id as string;
    }
    const ctx = await A().$context;
    await ctx.internalAdapter.updateUser(session.user.id, {shopifyCustomerId: gid});
    return gid;
  }

  async function run(query: string, opts: Opts = {}): Promise<Result> {
    const op = /\b(?:query|mutation)\s+(\w+)/.exec(query)?.[1];
    const v = opts.variables ?? {};
    const id = await customerGid();

    switch (op) {
      case 'CustomerDetails': {
        const d = await adminGraphql(env, Q.details, {id});
        const c = d.customer;
        if (!c) return {data: {customer: null}};
        return {data: {customer: {id: c.id, firstName: c.firstName, lastName: c.lastName, defaultAddress: toAddress(c.defaultAddress), addresses: {nodes: c.addressesV2.nodes.map(toAddress)}}}};
      }
      case 'CustomerOrders': {
        const q = [`customer_id:${numericId(id)}`, `tag:${brandTag}`, v.query as string | undefined].filter(Boolean).join(' AND ');
        const d = await adminGraphql(env, Q.orders, {q, first: v.first, last: v.last, after: v.endCursor, before: v.startCursor});
        const nodes = d.orders.nodes.map((o: any) => ({
          id: o.id, number: o.number, confirmationNumber: o.confirmationNumber, processedAt: o.processedAt,
          financialStatus: o.displayFinancialStatus, fulfillmentStatus: o.displayFulfillmentStatus,
          totalPrice: money(o.totalPriceSet), fulfillments: {nodes: o.fulfillments ?? []},
        }));
        return {data: {customer: {orders: {nodes, pageInfo: d.orders.pageInfo}}}};
      }
      case 'Order': {
        const d = await adminGraphql(env, Q.order, {id: v.orderId});
        const o = d.order;
        // Only this shopper's orders, and only from this brand.
        if (!o || o.customer?.id !== id || !o.tags?.includes(brandTag)) return {data: {order: null}};
        return {
          data: {
            order: {
              id: o.id, name: o.name, confirmationNumber: o.confirmationNumber, statusPageUrl: o.statusPageUrl,
              fulfillmentStatus: o.displayFulfillmentStatus, processedAt: o.processedAt,
              fulfillments: {nodes: o.fulfillments ?? []},
              totalShipping: money(o.totalShippingPriceSet), totalTax: money(o.totalTaxSet),
              totalPrice: money(o.totalPriceSet), subtotal: money(o.subtotalPriceSet),
              shippingAddress: o.shippingAddress,
              discountApplications: o.discountApplications,
              lineItems: {
                nodes: o.lineItems.nodes.map((li: any) => ({
                  id: li.id, title: li.title, quantity: li.quantity, variantTitle: li.variantTitle, image: li.image,
                  price: money(li.originalUnitPriceSet), totalDiscount: money(li.totalDiscountSet),
                  discountAllocations: li.discountAllocations.map((da: any) => ({allocatedAmount: money(da.allocatedAmountSet), discountApplication: da.discountApplication})),
                })),
              },
            },
          },
        };
      }
      case 'customerUpdate': {
        const input = {id, ...(v.customer as Record<string, unknown>)};
        const d = await adminGraphql(env, Q.update, {input});
        const c = d.customerUpdate.customer;
        return {data: {customerUpdate: {
          customer: c ? {firstName: c.firstName, lastName: c.lastName, emailAddress: {emailAddress: c.email}, phoneNumber: c.phone ? {phoneNumber: c.phone} : null} : null,
          userErrors: userErrors(d.customerUpdate.userErrors),
        }}};
      }
      case 'customerAddressCreate': {
        const d = await adminGraphql(env, Q.addressCreate, {customerId: id, address: toMailingInput(v.address), setAsDefault: v.defaultAddress ?? false});
        return {data: {customerAddressCreate: {customerAddress: d.customerAddressCreate.address, userErrors: userErrors(d.customerAddressCreate.userErrors)}}};
      }
      case 'customerAddressUpdate': {
        const d = await adminGraphql(env, Q.addressUpdate, {customerId: id, addressId: v.addressId, address: toMailingInput(v.address), setAsDefault: v.defaultAddress ?? false});
        return {data: {customerAddressUpdate: {customerAddress: d.customerAddressUpdate.address, userErrors: userErrors(d.customerAddressUpdate.userErrors)}}};
      }
      case 'customerAddressDelete': {
        const d = await adminGraphql(env, Q.addressDelete, {customerId: id, addressId: v.addressId});
        return {data: {customerAddressDelete: {deletedAddressId: d.customerAddressDelete.deletedAddressId, userErrors: userErrors(d.customerAddressDelete.userErrors)}}};
      }
      default:
        throw new Error(`Account query "${op}" is not mapped to the Admin API (src/server/auth/customer-account.ts)`);
    }
  }

  return {
    i18n: {language: locale.language},

    async isLoggedIn(): Promise<boolean> {
      return Boolean(await getSession());
    },

    async handleAuthStatus() {
      if (!(await getSession())) {
        const url = new URL(request.url);
        throw redirectTo(`${locale.pathPrefix}/account/login?return_to=${encodeURIComponent(url.pathname)}`);
      }
    },

    async login(_opts: Record<string, unknown> = {}) {
      return redirectTo(signInUrl(request.url, new URL(request.url).searchParams.get('return_to')));
    },

    async authorize() {
      return redirectTo(`${locale.pathPrefix}/account`);
    },

    async logout(opts: {postLogoutRedirectUri?: string} = {}) {
      const res = await A().api.signOut({headers: request.headers, asResponse: true});
      const headers = new Headers();
      for (const c of res.headers.getSetCookie()) headers.append('Set-Cookie', c);
      return redirectTo(opts.postLogoutRedirectUri ?? '/', headers);
    },

    query: run,
    mutate: run,
  };
}
