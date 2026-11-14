# Hydrogen → Next.js migration

Source: `C:\Users\Admin\Shopify\Storefronts\Hydrogen` (branch `main`, commit 53238fa).
Target: this repo, Next.js 16 (App Router) + React 19 + Tailwind 4.

## Status

Phase 1 is done: every Hydrogen route is ported and `pnpm build` passes.
Tested against the dev store: home, collection, product, search, cart, policies, blogs, sitemaps, robots, and add to cart in a real browser.

## How the code is laid out

| Folder | What it is | Rule |
|---|---|---|
| `src/core/` | Shopify client, cart service, storefront and brand config, locales | No Next.js or React imports. Reusable anywhere. |
| `src/server/` | Next.js glue: request context, session cookie, Customer Account login, route runner | Server only. |
| `src/routes/<name>/server.ts` | A route's loader, action, meta (from the Hydrogen route) | Server only. |
| `src/routes/<name>/view.tsx` | A route's page component | Client. |
| `src/app/` | Next.js routes. Generated, each one file. | Don't edit by hand: run `python scripts/gen-app.py`. |
| `src/components/`, `src/lib/` | Copied from Hydrogen, unchanged except imports | |
| `src/compat/` | Stand-ins for `react-router` and `@shopify/hydrogen` | Temporary. Shrink over time. |

How a page works: `src/app/[locale]/products/[handle]/page.tsx` runs `routes/products.$handle/server.ts` → `loader`, then renders `view.tsx` with the data.
How a form works: `CartForm`, `useFetcher` and `<Form>` post to `/api/rr/<page path>`, which runs that route's `action`, then the page refreshes.

## Phase 2: to do, in order

1. **Checkout pages that write cookies while loading.** Next.js pages can't set cookies. Affected: `/address` (saves `priceSnapshot` to the session), `/payment`, `/payment/complete` (clears the cart). Move those writes into the form actions or a route handler.
2. **Customer accounts.** Login code is written (`src/server/customer-account.ts`) but untested. Add the new callback URL in Shopify (Customer Account API settings): `https://<domain>/account/authorize`. Needs HTTPS, so test with a tunnel or on a preview deploy.
3. **Shopify URL redirects on 404** (Hydrogen's `storefrontRedirect`) and the `/.well-known/ucp` proxy are not ported yet.
4. **Optimistic cart.** The cart updates after the server answers (about 0.5 s). Hydrogen showed it instantly.
5. **Shopify's own analytics** (`sendShopifyAnalytics`). GA4 works; Shopify Analytics does not yet.
6. **Codegen.** `storefrontapi.generated.d.ts` is copied from Hydrogen. Add `@graphql-codegen/cli` + `@shopify/hydrogen-codegen` before changing queries.
7. **Caching.** Every page is dynamic for now (cart cookie). Storefront queries still use the data cache (`CacheLong` = 1 h + stale).
8. **Make the rest native**, same pattern as `features/`: cart + `CartForm` → Server Actions (removes most of `src/compat/`), search (then drop the `/api/rr` fallback in `infinite-product-grid.tsx`), home, policies, account, checkout. Delete `src/compat/`, `src/routes/` and `scripts/gen-app.py` when empty.

## Deploy

One Vercel project per storefront, same repo. Set `PUBLIC_STOREFRONT_ID` per project (ecombio 1000185153, BicycleBio 1000185154 on the live store).
Copy the other variables from the Hydrogen `.env` (see `.env.example`).
