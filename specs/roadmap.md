# Roadmap

Part of the Headless constitution. `roadmap.md` = the order of work, in very small phases. `plan.md` = tasks, status and log. Brand proof lives in `specs/brands/<brand>/`.
Each phase is a few sittings at most and ends with something you can see or check.
Status marks: DONE✅ · IN PROGRESS⚠️ · NOT STARTED❌

## Done
| # | Phase | Done when | Status |
| --- | --- | --- | --- |
| 0 | Codebase: Hydrogen ported to Next.js 16 on Cloudflare Workers | Build passes, deploys from GitHub | DONE✅ |
| 1 | BicycleBio live (Stripe test mode) | check-brand 12/12, test order #1004 | DONE✅ |
| 2 | Brand workflow + scripts (`docs/brand-launch.md`, `scripts/`) | A brand launches by copy-paste | DONE✅ |
| 3 | SkaterBio live | check-brand 12/12, test order #1005 | DONE✅ |

## Next, in order
| # | Phase | Done when | Status |
| --- | --- | --- | --- |
| 4 | ScooterBio: Shopify lets go of www (remove dev-store subdomains) | www.scooterbio.com shows the Worker | IN PROGRESS⚠️ |
| 5 | ScooterBio: Stripe webhook on www, hardening, check, test order | check-brand 0 failed, test order in Shopify | NOT STARTED❌ |
| 6 | ScooterBio: registration → Cloudflare Registrar, 20 email forwards → Email Routing | Root serves the Worker; email still arrives | NOT STARTED❌ |
| 7 | Clean-up of the 3 launches: cancel test orders, bikes ship ("physical product"), remove trade-in links | Orders list clean; no trade-in anywhere | NOT STARTED❌ |
| 8 | Brand look 1: brand registry holds name, logo, colors per brand | Each brand shows its own name and logo | NOT STARTED❌ |
| 9 | Brand look 2: menus from Shopify (`<brand>-main`, `<brand>-footer`) per brand | No e-bike menu on SkaterBio or ScooterBio | NOT STARTED❌ |
| 10 | Brand look 3: own header and footer for SkaterBio and ScooterBio | Each brand has its own layout | NOT STARTED❌ |
| 11 | Brand look 4: home page per brand (hero, hubs, deals from `<brand>-all`) | Home shows only that brand's products | NOT STARTED❌ |
| 12 | PLP 1: brand scope on /collections/all, search and sitemap | No other brand's products listed | NOT STARTED❌ |
| 13 | PLP 2: hub pages per brand (tiles, hero, deals, guides) | Each brand's hubs render with their own metafields | NOT STARTED❌ |
| 14 | PLP 3: filters, sort, empty state, product cards (badge, specs, stars) | README PLP checklist passes on 375px and 1440px | NOT STARTED❌ |
| 15 | Speed: persistent cache + Workers Paid; one Yotpo call per page | No "Too many subrequests" in `wrangler tail` | NOT STARTED❌ |
| 16 | PDP 1: read `pdp.*` metafields (P3.0) | Specs, FAQ, variants show from `pdp.*` | NOT STARTED❌ |
| 17 | PDP 2: step picker, recap sheets, banner, badges, variant URLs (P3.1) | Matches the Hydrogen PDP | NOT STARTED❌ |
| 18 | Customer sign-in on every brand domain (P1.4) | Sign in, orders, sign out on each brand | IN PROGRESS⚠️ |
| 19 | Quality: error pages, security headers, noindex on non-brand hosts | checklist C5, D2, D4 closed | NOT STARTED❌ |
| 20 | Search on Algolia (index per brand from the live store) | Search and filters served by Algolia | NOT STARTED❌ |
| 21 | Go live: Stripe live keys + live webhooks, rotate every key | One real order and refund per brand | NOT STARTED❌ |
| 22 | Watch two weeks: `wrangler tail`, Search Console, GA4 | Two clean weeks on all three brands | NOT STARTED❌ |

## Later
- Blogs and pages per brand (README "Blogs", "Pages").
- Remove the compat layer and generated routes (P6.1); clean unused metafields (P6.3).
- Brand email for every brand (P6.4).

## Holiday freeze
- Nov 25 – Dec 1: no live-store changes during BFCM.

## Milestones and timeline

Relative weeks: W1 = week of 2026-11-16. These are estimates; adjust them.

| Milestone | Phases | Target | Status |
| --- | --- | --- | --- |
| M1 All three brands live | 4-7 | W1-W2 | IN PROGRESS⚠️ |
| M2 Brand look and catalog | 8-14 | W3-W6 | NOT STARTED❌ |
| M3 Speed, product page, sign-in | 15-18 | W7-W9 | IN PROGRESS⚠️ |
| M4 Quality and search | 19-20 | W10-W11 | NOT STARTED❌ |
| M5 Go live and watch | 21-22 | W12-W14 | NOT STARTED❌ |

Phase 18 note: sign-in (email + password only) is built on branch `feat/customer-sign-in`, locally verified; still needs remote D1 migrations, secrets, deploy per brand, and a record in `validation/`.
