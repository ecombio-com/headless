# Tech stack

> Current stack as-is. Items marked **verify** were inferred and need confirming.

## Runtime and hosting
| Layer | Technology | Role / notes |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack dev) | `src/app/[locale]/...`; legacy Remix/Hydrogen-style `src/routes/*` with `server.ts` + `view.tsx` pairs behind `src/compat` |
| Language | TypeScript (strict) | `tsc --noEmit` is the type gate |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` | One Worker per brand (`headless-<brand>`) |
| Tooling | Wrangler 4, pnpm workspace | `wrangler.jsonc` holds per-brand environments |
| Images | Cloudflare Images binding (`IMAGES`) | |
| Styling | Tailwind CSS 4, `tw-animate-css`, `@tailwindcss/typography` | Tokens in `src/styles/tokens.css` |
| UI | Local `src/components/ui/*`, `@base-ui/react`, lucide-react, sonner | |

## Data and commerce
| Layer | Technology | Role / notes |
|---|---|---|
| Catalog / content | Shopify Storefront API | Typed via `storefrontapi.generated.d.ts` |
| Customer accounts | Shopify Customer Account API | `src/server/customer-account.ts`, `src/graphql/customer-account/*` |
| Admin access | Shopify Admin API | `src/server/auth/shopify-admin.ts` (client ID in env, secret in Worker secrets) |
| Checkout | Stripe (test mode) + `@shopify/checkout-kit` | Webhook at `/api/stripe/webhook` |
| Cart | `@shopify/hydrogen-react` helpers | |

## Authentication
- **Better Auth**, email + password only. No social providers, no plugins.
- Server: `src/server/auth/index.ts` (per-host instance cache, `trustedOrigins` from `hosts.ts`).
- Route: `src/app/api/auth/[...all]/route.ts`. Client: `src/lib/auth-client.ts`.
- Storage: Cloudflare D1, one database per brand, binding `AUTH_DB`; schema in `migrations/auth/0001_better_auth.sql`.
- Extra user field: `shopifyCustomerId` (linking to Shopify customers).
- Sessions: Better Auth defaults (cookie + `session` table). Cross-subdomain cookies are currently **off** (see roadmap).

## Third-party services
| Service | Use |
|---|---|
| Algolia | Search (search-only key in env) |
| Yotpo | Reviews and UGC |
| Klaviyo | Newsletter / marketing |
| Google Analytics 4 | Analytics with consent banner |
| Intercom messenger SDK | Support chat (**verify** it is in use) |

## Process and tooling
- Spec Kit 1.4.0 (`.specify/`, `.claude/skills/speckit-*`), constitution v1.0.0 in `.specify/memory/`.
- Brand scripts in `scripts/` (PowerShell): `cf-zone`, `cf-email`, `check-brand`, `set-brand-env`, `set-brand-secrets`, `enable-auth`, `set-auth-secrets`.
- Env files: `.env.<brand>`, `.env.production`, `.env.local` are **untracked**; only `.env.example` is committed.

## Decisions log
| Decision | Why |
|---|---|
| One Worker and one D1 per brand | Isolation of secrets, data and deploys |
| Email + password only | Simplest sign-in surface; OTP, Google and email-sending removed |
| Env files untracked | Public repo; only public-by-design values had been committed earlier |
| Per-host auth instance cache | Bindings are fixed per isolate; `baseURL` differs per host |

## Known issues
- 11 `implicit any` type errors in `product-view.tsx`, `product.ts`, `product-cross-sell.ts` (likely from regenerated `storefrontapi.generated.d.ts`).
- Next.js reports the `middleware` file convention as deprecated in favor of `proxy`.

## Requirements
**Minimum:** Node (Next 16 minimum, **verify**), pnpm, Wrangler 4, a Cloudflare account with Workers + D1, Shopify Storefront and Customer Account API access, Stripe test keys.
**Recommended:** Workers paid plan, a staging Worker per brand, CI with `tsc --noEmit`, secret management only through the `set-*-secrets.ps1` scripts.
