# Headless Storefront

One codebase that runs a family of brand stores on one Shopify store.

| Service | Role |
| --- | --- |
| Shopify | Headless storefront per brand (catalog, carts, orders, customers) |
| Cloudflare | Workers (one per brand), DNS, security |
| GitHub | Project repository `ecombio-com/headless`, deploys per brand |
| Stripe | Payment gateway (one account, one webhook per brand) |

Rules: `.specify/memory/constitution.md`. Why, how, when: `specs/mission.md`, `specs/tech-stack.md`, `specs/roadmap.md`. Tasks and status: `plan.md`.

## Core Key Takeaways

- This Headless setup should focus on becoming domain-specific, serving as a multi-storefront across various domains such as the following: bicyclebio.com, scooterbio.com, skaterbio.com; It was derived from a general-purpose ecombio.com
- Started as a Vercel/NextJS Storefront https://vercel.shop/ C:\Users\Admin\Shopify\References\storefronts migrated to Shopify/Hydrogen Storefront https://mock.shop/ C:\Users\Admin\Shopify\Storefronts\Hydrogen
- Now: Next.js 16 on Cloudflare Workers, one Worker per brand, all from this repo.

## Brands

| Brand | Domain | Sells | Worker | Status | Proof |
| --- | --- | --- | --- | --- | --- |
| BicycleBio | bicyclebio.com | Electric bikes, bikes | `headless-bicyclebio` | Live (Stripe test mode) | `specs/brands/bicyclebio/` |
| SkaterBio | skaterbio.com | Electric skateboards, Onewheels, skateboards | `headless-skaterbio` | Live (Stripe test mode) | `specs/brands/skaterbio/` |
| ScooterBio | scooterbio.com | Electric scooters, kick scooters | `headless-scooterbio` | In progress | `specs/brands/scooterbio/` |

ecombio.com is not served by this repo (it stays on Hydrogen).

## How it works

```
Shopper → Cloudflare (DNS, TLS, rules) → Worker headless-<brand> → Next.js page
        → Shopify Storefront API (+ Yotpo) → page streamed back
Checkout: /cart → /address → /payment (Stripe) → /payment/complete
        → Shopify order (Admin API, ECOMBIOv2 app), tagged storefront=<brand>
        → Stripe webhook /api/stripe/webhook = backup that creates the order
```

- **Brand:** `BRAND=<brand>` in `.env.<brand>` picks the brand's name, menus (`<brand>-main`, `<brand>-footer`), home collection (`<brand>-all`) and layout (`src/brands/layouts.ts`).
- **Brand scope:** a handle prefixed with another brand (`scooterbio-…`) returns 404 on this brand.
- **Settings precedence:** Worker secrets/variables > `.env.<brand>`.

## Repository layout

| Folder | What | Rule |
| --- | --- | --- |
| `src/app/` | Next.js routes (App Router) | Native pages hand-written; generated wrappers via `scripts/gen-app.py` |
| `src/features/` | Native page logic: product, collection, blog, pages | New pages go here |
| `src/routes/` | Routes ported from Hydrogen (`server.ts` + `view.tsx`) | Being retired |
| `src/core/` | Shopify client, cart, storefront + brand config, locales | No `next/*` or `react` |
| `src/server/` | Request context, session, Customer Account login, route runner | Server only |
| `src/components/`, `src/lib/` | UI and helpers | `'use client'` only when interactive |
| `src/brands/` | Per-brand layouts and registry | Brand differences live here |
| `src/@yotpo/`, `src/@algolia/` | Reviews, search | Fail safely |
| `src/compat/` | Hydrogen/React Router stand-ins | New code never imports it |
| `scripts/` | Brand and ops scripts (below) | Read-only first, secrets masked |
| `docs/brand-launch.md` | The 9-step brand launch | — |
| `specs/`, `.specify/`, `validation/` | Constitution, feature specs, test records | Spec Kit flow |

## Getting started

Prerequisites: Node 22, pnpm, PowerShell 7, `wrangler` (in the repo), `cf`, `gh`, `stripe`, `specify` (Spec Kit).

| Command | Does |
| --- | --- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Local server on http://localhost:3000 (reads `.env.local`) |
| `pnpm typecheck` | Type check |
| `pnpm build` | Production build (Next.js) |

Never run `pnpm run deploy` locally: it packs `.env.local` into the Worker.

## Settings and secrets

| File / place | Holds | In git |
| --- | --- | --- |
| `.env.<brand>` | Public values per brand: `BRAND`, store domain, public Storefront token, Customer Account client ID, Stripe publishable key, flags | Yes |
| Worker secrets (`headless-<brand>`) | `PRIVATE_STOREFRONT_API_TOKEN`, `SESSION_SECRET`, `SHOPIFY_ADMIN_CLIENT_SECRET`, `KLAVIYO_PRIVATE_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | No |
| `.env.local` | Local development values | No |

Flags: `STRIPE_CHECKOUT_ENABLED` (own checkout with Stripe), `CHECKOUT_KIT_ENABLED`, `ALGOLIA_ENABLED` (off).

## Deploy

Push to `main` → GitHub Actions builds and deploys each brand in its own GitHub Environment (`deploy (<brand>)`); one brand failing never stops the others. Brands deploy only once they are in the matrix in `.github/workflows/deploy.yml`. Watch: `gh run watch`.

## Scripts

| Script | Does |
| --- | --- |
| `scripts\check-brand.ps1 -Brand <b> -Domain <d>` | Read-only health check: deploy, secrets, page, brand, store links, webhook, Stripe endpoint |
| `scripts\set-brand-env.ps1 -Brand <b>` | Saves a brand's public Shopify values (masked input) |
| `scripts\set-brand-secrets.ps1 -Brand <b> -Domain <d>` | Stores 6 Worker secrets and creates the Stripe webhook |
| `scripts\cf-zone.ps1 -Domain <d> -Action add\|list\|free\|harden` | Cloudflare zone: add, inspect, delete Shopify records (asks first), HTTPS + Bot Fight Mode + Stripe skip rule |
| `scripts\cf-email.ps1 -Domain <d> -To <inbox>` | support@ email via Cloudflare Email Routing (parked) |

## Storefront

### Page map

| Page | URL | Built by |
| --- | --- | --- |
| Home | `/<locale>` | `src/routes/_index`, `src/components/home` |
| Collection / Hub | `/<locale>/collections/<handle>` | `src/features/collection` |
| All products | `/<locale>/collections/all` | `src/features/collection/catalog*` |
| Collections index | `/<locale>/collections` | `collections-index.tsx` |
| Product | `/<locale>/products/<handle>` | `src/features/product` |
| Search | `/<locale>/search?q=` | `src/routes/search` |
| Cart | `/<locale>/cart` | `src/routes/cart` |
| Address → Payment → Complete | `/<locale>/address`, `/payment`, `/payment/complete` | `src/routes/address`, `payment`, `payment_.complete` |
| Account (orders, profile, addresses) | `/<locale>/account/…` | Customer Account API, `src/routes/account*` |
| Journal (all blogs) | `/<locale>/blogs` | `src/features/blog/journal.tsx` |
| Blog, article | `/<locale>/blogs/<blog>`, `/blogs/<blog>/<article>`, `/blogs/articles/<article>` | `src/features/blog` |
| Blog category, tag, author | `/<locale>/blogs/category/<c>`, `/tag/<t>`, `/author/<a>` | `src/features/blog` |
| Page | `/<locale>/pages/<handle>` | `src/features/pages/shopify-page.tsx` |
| Policies | `/<locale>/policies`, `/policies/<handle>` | `src/routes/policies*` |
| Sitemaps, robots | `/sitemap.xml`, `/sitemap/<type>/<page>`, `/robots.txt` | `src/app/sitemap*`, `robots.txt` |
| APIs | `/api/stripe/webhook`, `/api/checkout-*`, `/<locale>/api/predictive-search`, `/api/yotpo/reviews`, `/api/newsletter` | `src/app/api`, `src/app/[locale]/api` |

`<locale>` is `en-us` today; `/` redirects there.

### Site-wide
- Header and footer per brand (`src/brands/layouts.ts`); menus from Shopify (`<brand>-main`, `<brand>-footer`).
- Announcement bar: metaobject `announcement_bar` (handle `main`).
- Predictive search in the header; locale bar; newsletter signup.
- SEO: canonical URLs, JSON-LD (Organization, Product, CollectionPage, BreadcrumbList, Article), sitemaps per type, robots.txt.

### Home
- BicycleBio: its own home (`BicycleBioHome.tsx`). Other brands: `BrandHome.tsx` (hero, featured products from `<brand>-all`, trust items).
- Content metaobjects (ecombio-style home): `home_slide`, `home_study`, `home_story`, `home_showcase`, `home_category`, `home_shop_category`, `home_video`, `home_press`, `home_faq`.

### Products
Product Details Page (PDP): one product, its variants and everything needed to buy it.
Product Listing Page (PLP): Category (collection) or Query (search)

#### Key features of a product detail page
Product title
Product description
Additional product details or specifications
High-quality digital assets
Price
Availability
Quantity to purchase
Call to action
Return and exchange policy details
Fulfillment options

#### PDP Structure

##### Product metafields (namespace: pdp)
| Section | Key | Type |
|---|---|---|
| Product Variants | pdp.variants | JSON |
| Frequently Bought Together | pdp.bundles | Product reference (List) |
| You May Also Like (alternatives) | — | Shopify recommendations: RELATED |
| Pairs Well With (add-ons) | — | Shopify recommendations: COMPLEMENTARY (Search & Discovery) |
| Customer Reviews | — | Reviews widget |
| Frequently Asked Questions | pdp.faq | JSON |
| Popular Searches | pdp.searches | Single line text (List) |
| Technical Specifications | pdp.specs | JSON |
| Related Articles | pdp.articles | Blog post reference (List) |
| Banner | pdp.banner | Metaobject reference (One) → pdp_banner |
| Badges | pdp.badges | Metaobject reference (List) → pdp_badge |

##### Metaobject: pdp_banner (Product page banner)
| Field | Key | Type | Required |
|---|---|---|---|
| Heading | heading | Single line text | Yes |
| Body | body | Multi-line text | No |
| Button label | button_label | Single line text | No |
| Button URL (relative or full) | button_url | Single line text | No |
| Image | image | File (Image) | Yes |
| Mobile image | mobile_image | File (Image) | No |

##### Metaobject: pdp_badge (Badge item)
| Field | Key | Type | Required |
|---|---|---|---|
| Label | label | Single line text | Yes |
| Icon | icon | Single line text, choice list | Yes |

Icon choices: warranty, shipping, returns, support, payment, quality

##### Migration (old → new)
- pdp.steps → pdp.variants
- custom.frequently_bought_together → pdp.bundles
- custom.popular_searches → pdp.searches
- custom.reassurance → pdp.badges
- Metaobject type reassurance_item → pdp_badge

#### Key features of a product listing page
Clear title and short intro (what this list is)
Product grid with cards: image, title, price, compare-at price (Saving), star rating, badge, 2–3 key specs
Product count
Filters (Shopify Search & Discovery): availability, price range, product type, vendor, metafield filters
Active filter chips with "clear all"
Sort
Load more (infinite scroll, no page numbers)
Quick add to cart from the card
Empty state with a way out (clear filters, popular searches)
Breadcrumbs and SEO (canonical URL, CollectionPage + BreadcrumbList JSON-LD)

#### PLP Structure

##### PLP types
| Type | URL | Built from | When |
|---|---|---|---|
| Hub | /collections/<hub> | Collection with `custom.layout` = hub | Top-level product area (e.g. Electric Bikes) |
| Standard collection | /collections/<handle> | Any other collection | Sub-collections, brand-only lists |
| All products | /collections/all | Every product in the brand's scope | Catalog browse |
| Search results | /search?q=… | Shopify Storefront search (Algolia later) | A shopper's query |
| Predictive search | Header search box | /api/predictive-search | As the shopper types |

##### Sections by type (top to bottom)
| Section | Hub | Standard | Search |
|---|---|---|---|
| Sub-collection tiles (Hub → Sub-collections) | Yes | — | — |
| Hub hero (featured products) | Yes | — | — |
| Trust bar (warranty, shipping, returns, support) | Yes | — | — |
| Tabs: Products · Articles | — | Yes | — |
| Filters (sidebar on desktop, sheet on mobile) + Sort | — | Yes | Yes |
| Deals (Picked Deals, else the 8 biggest Savings) | Yes | Yes | — |
| Product grid (infinite) | via tiles | Yes | Yes |
| Articles (`custom.posts`) | Yes | Articles tab | — |
| Customer reviews (Yotpo) | Yes | Yes | — |
| Guides (`custom.hub_guides`) | Yes | — | — |
| After-item content page (`custom.after_item_lists`) | Yes | Yes | — |

##### Collection metafields (namespace: custom)
| Section | Key | Type |
|---|---|---|
| Layout (hub or standard) | custom.layout | Single line text |
| Hub hero | custom.hub_hero | Reference |
| Sub-collections (Hub → its Sub-collections) | custom.sub_collections | Collection reference (List) |
| Picked Deals | custom.deals | Product reference (List) |
| Guides | custom.hub_guides | Reference (List) |
| Articles | custom.posts | Blog post reference (List) |
| After-item content | custom.after_item_lists | Page reference |

##### Product card fields
| Field | Source |
|---|---|
| Image, title, price, compare-at price | Shopify product + first available variant |
| Badge | custom.card_badge |
| Key specs (2–3) | custom.card_specs (JSON list), else the first 3 of custom.product_specs |
| Star rating | Yotpo (Shopify `yotpo.reviews_average` / `reviews_count` metafields planned) |
| Quick add | Variant id, availability |

##### Sort options
| Label | Collections | Search |
|---|---|---|
| Best Matches (merchandised / relevance) | Yes | Yes |
| Best Selling | Yes | — |
| Price: Low to High / High to Low | Yes | Yes |
| Name: A-Z / Z-A | Yes | — |
| Date: New to Old / Old to New | Yes | — |

##### Brand scope
- Each brand lists only its own products: smart collection `<brand>-all` (tag `brand:<brand>`) is the brand's catalog and home collection.
- Handles prefixed with another brand (`scooterbio-…`) return 404 on this brand.
- Search, /collections/all, sitemap and menus (`<brand>-main`, `<brand>-footer`) follow the same scope.

##### Search engine
- Now: Shopify Storefront search + Search & Discovery filters, synonyms and boosts.
- Later: Algolia (built, `ALGOLIA_ENABLED=false`) once its index holds live-store products per brand.

### Collections
- **Hub:** a top-level Collection for a whole product area; it lists its own products and leads to its Sub-collections. Never under another Hub (two levels max).
- **Sub-collection:** a Collection listed under a Hub; may sit under more than one Hub; its **Canonical Parent** is the one Hub used for breadcrumbs and SEO.
- **Brand catalog:** smart collection `<brand>-all` (tag `brand:<brand>`); shared products carry several brand tags.
- **Deal / Saving / Picked Deals:** see `GLOSSARY.md`.

### Search
- Results page with filters and sort (Best Matches, price); predictive search while typing.
- Engine: Shopify Storefront search + Search & Discovery now; Algolia later (click tracking already built).

### Cart and checkout
- Cart page (Back Market style): lines, Savings, free shipping note, promo code, perks.
- Address: shipping and billing, delivery method (Standard free, Expedited paid).
- Payment: Stripe Payment Element (card, Link, wallets, BNPL as Stripe offers); tax shown before paying.
- Complete: order number, receipt email, next steps. The Shopify order is created as Paid.
- Switch back to Shopify hosted checkout: `STRIPE_CHECKOUT_ENABLED=false`.

### Account
- Sign-in with Shopify Customer Account API (`/account/login`, `/account/authorize`, `/account/logout`).
- Orders, order detail, profile, addresses.
- Each brand domain needs its callback, logout and origin URLs in its storefront's Customer Account API settings.

### Blogs
| Feature | Source |
| --- | --- |
| Journal: every blog's latest articles | Shopify blogs |
| Blog, category (`parent_blog`), tag, author pages | Shopify blogs + `custom.parent_blog` |
| Article: body, widgets, Article JSON-LD | Shopify article |
| Author profile | `custom.author_profile` |
| Articles on collections and hubs | `custom.posts` |
| Related articles on products | `pdp.articles` |

### Pages
- Shopify Pages at `/pages/<handle>`, laid out with `custom.layout_blocks`: blocks `hero`, `text`, `stats`, `band`, `split`, `cards`.
- Hidden pages (never listed or indexed on their own): `after-item(s)-*` (shown on collections), `technical-specifications-*`, `frequently-asked-questions-*`, and `<brand>-<policy>` (served only at `/policies/<policy>`).

### Policies
- `/policies/<handle>`: privacy, refund, shipping, terms of service; a brand's own copy comes from page `<brand>-<policy>` when it exists.

## Integrations

| Service | Used for | State |
| --- | --- | --- |
| Shopify Storefront API | Catalog, cart, search, content | On |
| Shopify Admin API (ECOMBIOv2) | Creating paid orders | On |
| Shopify Customer Account API | Sign-in, orders | Built; URLs per brand pending |
| Stripe | Payment on /payment, webhook backup | On (test mode) |
| Yotpo | Ratings and reviews | On (subrequest limit on Workers Free) |
| Algolia | Search | Built, off |
| GA4 | Analytics with consent banner | On |
| Klaviyo | Email marketing | Key set, not wired |

## Spec-Driven Development

- Constitution: `.specify/memory/constitution.md` (9 principles).
- New feature: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement` (Claude Code in VS Code, in this folder). Folders: `specs/NNN-feature/`.
- Gate: `pnpm typecheck`, `pnpm build`, acceptance criteria, proof in `validation/` (brands: `specs/brands/<brand>/validation.md`), then `plan.md`.

## Known gaps

`checklist.md` (audit) and `plan.md` (tasks). Highlights: no persistent cache yet (Yotpo subrequest warning), compat layer still in use, no error pages or security headers, brand looks still shared, Stripe in test mode.
