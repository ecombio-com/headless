# Roadmap

Legend: NOT STARTED❌  DONE✅  IN PROGRESS⚠️
Timeline is relative: W0 = week of 2026-11-15. Each task is sized to about one working session.
Statuses were seeded from commit history and this session; **verify** the brand-launch rows against production.

## Milestones
| Milestone | Target | Status |
|---|---|---|
| M0 Foundations in place | W0 | DONE✅ |
| M1 Customer sign-in shipped to one brand | W1 | IN PROGRESS⚠️ |
| M2 Type-clean build and CI gate | W2 | NOT STARTED❌ |
| M3 Sign-in live on all three brands | W3 | NOT STARTED❌ |
| M4 Checkout ready for live mode | W5 | NOT STARTED❌ |

## Phase 0: Foundations (project: platform)
| Task | Sub-task | Timeline | Status |
|---|---|---|---|
| 0.1 Spec Kit adopted | Constitution v1.0.0, README spec | before W0 | DONE✅ |
| 0.2 Multi-brand Workers | One Worker per brand; BicycleBio, ScooterBio, SkaterBio launched (**verify** live) | before W0 | DONE✅ |
| 0.3 Stripe checkout in test mode | Webhook route, checkout-kit | before W0 | DONE✅ |
| 0.4 Env hygiene | Untrack `.env.*`, ignore rule, audit history (no secrets found) | W0 | DONE✅ |
| 0.5 Tooling cleanup | Remove stray agent skill folders from the failed install | W0 | DONE✅ |

## Phase 1: Customer sign-in (project: auth)
| Task | Sub-task | Timeline | Status |
|---|---|---|---|
| 1.1 Email + password only | Minimal server, route, client, form | W0 | DONE✅ |
| 1.2 Local verification | Sign-up and sign-in return 200 on local D1 | W0 | DONE✅ |
| 1.3 Open and review PR | `feat/customer-sign-in` to `main` | W1 | IN PROGRESS⚠️ |
| 1.4 Decide sign-up policy | `disableSignUp` yes/no; user creation path | W1 | NOT STARTED❌ |
| 1.5 Decide cookie scope | Need `crossSubDomainCookies`? Test auth host vs storefront | W1 | NOT STARTED❌ |
| 1.6 Remote migration, BicycleBio | Apply `0001_better_auth.sql` to remote D1 | W1 | NOT STARTED❌ |
| 1.7 Secrets, BicycleBio | Run `set-auth-secrets.ps1`; remove unused Google/Brevo handling | W1 | NOT STARTED❌ |
| 1.8 Deploy and smoke test | Sign up, sign in, sign out on `auth.bicyclebio.com` | W1 | NOT STARTED❌ |
| 1.9 Roll out | Repeat 1.6 to 1.8 for ScooterBio, then SkaterBio | W3 | NOT STARTED❌ |
| 1.10 Remove dead code | `googleEnabled` prop in `sign-in/page.tsx` | W2 | NOT STARTED❌ |

## Phase 2: Type health (project: quality)
| Task | Sub-task | Timeline | Status |
|---|---|---|---|
| 2.1 Diagnose 11 errors | Diff `storefrontapi.generated.d.ts`; find the cause | W2 | NOT STARTED❌ |
| 2.2 Fix errors | `product-view.tsx`, `product.ts`, `product-cross-sell.ts` | W2 | NOT STARTED❌ |
| 2.3 CI gate | Run `tsc --noEmit` on PRs | W2 | NOT STARTED❌ |
| 2.4 Proxy migration | `middleware` to `proxy` on its own branch | W4 | NOT STARTED❌ |

## Phase 3: Product page (project: storefront)
| Task | Sub-task | Timeline | Status |
|---|---|---|---|
| 3.1 PDP metafields | Per `specs/P3.0-pdp-metafields.md` | W2 | IN PROGRESS⚠️ |
| 3.2 PDP components | Recap, step picker, banner, reassurance, wishlist | W2 | IN PROGRESS⚠️ |
| 3.3 Collection catalog view | `catalog-view.tsx` replacing `catalog.tsx` | W3 | IN PROGRESS⚠️ |
| 3.4 Sitemap XSL | `sitemap.xsl` route and format | W3 | IN PROGRESS⚠️ |

## Phase 4: Checkout readiness (project: commerce)
| Task | Sub-task | Timeline | Status |
|---|---|---|---|
| 4.1 Test-mode end-to-end | Order placed, webhook received, Shopify order created | W4 | NOT STARTED❌ |
| 4.2 Live-mode checklist | Keys, webhook endpoint, refunds, tax and shipping | W5 | NOT STARTED❌ |
| 4.3 Monitoring | Webhook failures, error alerts | W5 | NOT STARTED❌ |

## Phase 5: New brands (project: platform)
| Task | Sub-task | Timeline | Status |
|---|---|---|---|
| 5.1 Launch checklist rehearsal | Dry run of `docs/brand-launch.md` on a scratch brand | W6 | NOT STARTED❌ |
| 5.2 Brand validation docs | Fill each `specs/brands/<brand>/validation.md` | W6 | NOT STARTED❌ |
