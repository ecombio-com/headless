# plan.md — Headless storefront

The single source of truth for the Headless launch.
Repo: `ecombio-com/headless` · Host: Cloudflare Worker `ecombio-headless` · Updated: 2026-11-14

---

## 0. Rules (read first, every session)

1. **Update this file with every change.** No commit without a matching edit here (status, notes, or log line).
2. **Every feature passes validation before it is marked done.** See §2. A failed check means it stays `[~]`.
3. **Re-plan when a trigger fires.** See §3. Write the change in §6 before doing new work.
4. **Dev first, prod in batches.** Build and test on the dev store and dev Worker. Deploy to prod only at a milestone or a batch of approved work.
5. **No new branches unless asked.** `main` holds the code; Wrangler environments pick the store and keys.

### Three documents

| Document | Role | Answers |
| --- | --- | --- |
| `plan.md` | Implementation | What gets built, in what order, and its status |
| `specs/<ID>-<slug>.md` | Specification | What one feature must do (acceptance criteria) |
| `validation/<ID>-<slug>.md` | Validation | Proof it passed: the gate + every acceptance criterion |

Flow for every feature: **spec → build → validate → update plan**.

1. Copy `specs/_template.md` and write the spec before any code. Link it on the task's `Spec:` line.
2. Build it. Mark the task `[~]`, then `[v]` when built.
3. Copy `validation/_template.md` and record a run. Link it on the task's `Validated:` line.
4. PASS → `[x]` and a §7 log line. FAIL → fix and run again; 2 fails → re-plan (§3).

Small tasks (no UI, no data change, under one sitting) may skip the spec; they still need a validation run.

### Status legend

| Mark | Meaning |
| --- | --- |
| `[ ]` | Not started |
| `[~]` | In progress |
| `[v]` | Built, waiting for validation |
| `[x]` | Done and validated |
| `[!]` | Blocked (say why) |
| `[-]` | Dropped (say why in §6) |

### Hierarchy

`Milestone (M#)` → `Project (P#)` → `Task (P#.#)` → `Sub-task (P#.#.#)`

- Every task names its milestone and its validation.
- Sub-tasks are the smallest unit of work: one sitting, one commit.

---

## 1. Environments

| Layer | Dev | Prod |
| --- | --- | --- |
| Shopify | ecombio.myshopify.com | khkkyb-b8.myshopify.com |
| Cloudflare Worker | ecombio-headless-dev (workers.dev) | ecombio-headless (bicyclebio.com; test host headless.bicyclebio.com) |
| Storefront (brand) | 1000184544 (Ecombio) | 1000185154 (BicycleBio) |
| Stripe | Test keys | Live keys |
| Yotpo | Dev store app key | Prod store app key |
| Algolia | Dev products index | Prod products index (app ZDKXGX95HE) |
| Settings | `.env.local` | Worker secrets |

Retired: ecombio-store.myshopify.com (after P1.1 check).

---

## 2. Validation gate (every feature)

A task moves from `[v]` to `[x]` only when every line that applies passes.
Record each run in `validation/<ID>-<slug>.md` and link it on the task's `Validated:` line.

**Code**
- [ ] `pnpm typecheck` passes with no new errors
- [ ] `pnpm build` passes (before any prod deploy)
- [ ] No new hard-coded colors or sizes (tokens only)
- [ ] No secrets in the diff

**Behavior (on the dev Worker)**
- [ ] The page returns 200 and shows the feature
- [ ] Matches the Hydrogen reference, or the difference is approved
- [ ] No errors in `wrangler tail` during 3 page loads
- [ ] No "Too many subrequests" warning

**UI/UX (frontend tasks)**
- [ ] 375px and 1440px both look right
- [ ] Works by keyboard; focus is visible
- [ ] Reduced motion respected (except approved exceptions)
- [ ] Empty, loading and error states exist

**Data (backend tasks)**
- [ ] Works against the dev store and the prod store
- [ ] Cache time is set on purpose
- [ ] Fails safely when the service is down (no crash)

---

## 3. Re-planning triggers

Stop and re-plan (write it in §6) when any of these happen:

1. A task fails validation twice.
2. A milestone date will slip by more than 2 working days.
3. A finding changes an earlier decision (store, plan, tool, cost).
4. A task turns out to need a task that is not in this file.
5. A new request arrives that is bigger than one sub-task.

Re-plan steps: name the trigger → list the options → pick one → update §4 and §5 → log in §6.

---

## 4. Milestones

| ID | Milestone | Dates | Projects | Done when | Status |
| --- | --- | --- | --- | --- | --- |
| M0 | Foundation | Nov 16 – Nov 20 | P1 | One command deploys to dev, one to prod; sign-in works on both stores | `[ ]` |
| M1 | Integrations | Nov 23 – Dec 4 | P2 | Yotpo, Algolia and a Stripe test order work on the dev Worker | `[ ]` |
| — | Holiday freeze | Nov 25 – Dec 1 | — | No prod changes; Hydrogen stays live through BFCM | — |
| M2 | Frontend parity | Dec 7 – Dec 11 | P3 | Every Hydrogen-only gap is built on Headless | `[ ]` |
| M3 | Ready to go | Dec 14 – Dec 18 | P4, P5.1 | A real order and refund pass on prod via workers.dev | `[ ]` |
| — | Holiday buffer | Dec 21 – Jan 1 | — | Fixes only | — |
| M4 | Launch | Tue Jan 5, 2027 | P5.2 – P5.3 | bicyclebio.com serves Headless; Oxygen is the rollback | `[ ]` |
| M5 | Stable | Jan 19, 2027 | P5.4 – P5.5 | Two clean weeks; Oxygen retired | `[ ]` |

---

## 5. Projects, tasks, sub-tasks

### P1 Foundation (backend) — M0

- [ ] **P1.1 Lock the stores**
  - [ ] P1.1.1 Check ecombio-store for orders, customers and apps that exist nowhere else
  - [ ] P1.1.2 Export anything unique, then retire ecombio-store
  - [ ] P1.1.3 Write the store map (dev = ecombio, prod = khkkyb-b8) into CLAUDE.md
  - Validate: store map in CLAUDE.md matches §1
  - Validated: —
- [ ] **P1.2 Split dev and prod settings**
  - [ ] P1.2.1 Confirm `.env.local` and `.env.production` are git-ignored and not tracked
  - [ ] P1.2.2 Add `dev` and `production` environments to `wrangler.jsonc`
  - [ ] P1.2.3 Add pnpm scripts `deploy:dev` and `deploy:prod`
  - [ ] P1.2.4 Move prod keys into Worker secrets
  - Validate: each script deploys to the right Worker and store; no keys in git
  - Validated: —
- [ ] **P1.3 Upgrade to Cloudflare Workers Paid**
  - Validate: plan shows Paid in the dashboard
  - Validated: —
- [ ] **P1.4 Customer sign-in on both stores**
  - [ ] P1.4.1 Add callback, origin and logout URLs for workers.dev, headless.bicyclebio.com and bicyclebio.com
  - [ ] P1.4.2 Test sign-in at /en-us/account/login on dev and prod
  - Validate: sign in, view orders, sign out on both stores
  - Validated: —
- [~] **P1.6 Prod Worker = BicycleBio on bicyclebio.com**
  - Finding (2026-11-14): workers.dev renders `data-brand="ecombio"` from ecombio.myshopify.com (dev store); `.env.production` holds dev values (1000184544)
  - [x] P1.6.1 Worker vars: PUBLIC_STOREFRONT_ID=1000185154, PUBLIC_STORE_DOMAIN=khkkyb-b8.myshopify.com, BicycleBio Storefront API token (secret)
  - [v] P1.6.2 Checkout host: `src/lib/checkout-host.ts` rewrites to store.ecombio.com (banned); point to the live store's checkout domain
  - [x] P1.6.3 Test host `headless.bicyclebio.com` as a Worker custom domain (apex + www stay on Shopify until P5.3)
  - [ ] P1.6.4 `.env.production`: stop tracking it or keep only non-secret prod values (ties to P1.2.1)
  - Validate: headless.bicyclebio.com returns 200, `data-brand="bicyclebio"`, product links from khkkyb-b8, no `ecombio.myshopify.com` in the HTML
  - Validated: 2026-11-14 PASS (commit 1acf964). Note: workers.dev now returns 1042 (off once a custom domain is set); headless.bicyclebio.com is the test host
- [ ] **P1.5 Repo hygiene**
  - [ ] P1.5.1 Usage check, then delete unused stock files (Aside, CartMain, CartLineItem, CartSummary, ProductItem, PaginatedResourceSection, SearchForm*, SearchResults*)
  - [ ] P1.5.2 Rotate the exposed Algolia write and CLI keys
  - Validate: typecheck passes; old keys rejected
  - Validated: —

### P2 Integrations (backend) — M1

- [ ] **P2.1 Shopify**
  - [ ] P2.1.1 Storefront and Admin tokens for each store
  - [ ] P2.1.2 Compare dev vs prod metafields
  - [ ] P2.1.3 Product-update webhook clears the cache
  - Validated: —
- [ ] **P2.2 Yotpo**
  - [ ] P2.2.1 One bulk call for card star ratings, with per-product fallback
  - [ ] P2.2.2 Separate app keys for dev and prod
  - Validate: home page shows stars with no subrequest warning
  - Validated: —
- [ ] **P2.3 Algolia**
  - [ ] P2.3.1 Export products to dev and prod indexes
  - [ ] P2.3.2 Price and newest sort replicas
  - [ ] P2.3.3 Turn search on in dev, then prod
  - Validated: —
- [ ] **P2.4 Stripe**
  - [ ] P2.4.1 Test-mode order end to end on the dev store
  - [ ] P2.4.2 Webhook endpoint per environment
  - [ ] P2.4.3 Paid order lands in Shopify with tax, shipping and refund
  - [ ] P2.4.4 Settle fees; Shopify checkout stays default until then
  - Validated: —
- [ ] **P2.5 Analytics** — GA4 with consent, Shopify analytics events
  - Validated: —

### P3 Frontend parity (UI) — M2

- [~] **P3.0 PDP metafields (`pdp.*` namespace)** — started early, data work only
  - Spec: specs/P3.0-pdp-metafields.md (draft)
  - [ ] P3.0.1 Inventory: list current `custom.*` / `pdp.*` definitions and value counts on dev and prod
  - [ ] P3.0.2 Approve the target field list (spec §4)
  - [ ] P3.0.3 Script: create `pdp.*` definitions (dry run, dev, then prod)
  - [ ] P3.0.4 Script: copy values `custom → pdp`, merge delivery fields
  - [ ] P3.0.5 Code: read `pdp.*` with `custom.*` fallback
  - [ ] P3.0.6 Validate against spec §7
  - Validated: —
- [ ] **P3.1 Product page**
  - [ ] P3.1.1 Step picker (+ pdp-steps)
  - [ ] P3.1.2 Recap sheets
  - [ ] P3.1.3 PDP banner
  - [ ] P3.1.4 Reassurance bar
  - [ ] P3.1.5 Related articles
  - [ ] P3.1.6 Wishlist button
  - [ ] P3.1.7 Variant URLs (`variant_url` metaobjects, canonical, sitemap) — Hydrogen has it, Headless does not
  - Validated: —
- [ ] **P3.2 Cart** — added-to-cart screen
  - Validated: —
- [ ] **P3.3 SEO** — sitemap XSL, robots.txt, JSON-LD checks
  - Validated: —
- [ ] **P3.4 Brands** — BicycleBio renders from the same code
  - Validated: —

### P4 UX quality — M3

- [ ] **P4.1 Screen sizes** — 375 / 768 / 1440px on home, collection, product, cart, checkout, account
- [ ] **P4.2 Accessibility** — keyboard, visible focus, form labels
- [ ] **P4.3 Speed** — hero does not wait on Yotpo; image sizes; Core Web Vitals
- [ ] **P4.4 Copy** — empty, error and loading states

### P5 Launch — M3 to M5

- [ ] **P5.1** QA on prod via workers.dev: real order + refund, sign-in, search
- [ ] **P5.2** Redirects: Shopify URL redirects, /es-us → /en-us
- [ ] **P5.3** Point bicyclebio.com (apex + www) at the Worker; keep Oxygen as rollback
- [ ] **P5.4** Watch two weeks: `wrangler tail`, Search Console, GA4
- [ ] **P5.5** Retire Oxygen

### P6 After launch — backlog

- [ ] P6.1 Remove the compat layer, one area at a time
- [ ] P6.2 Bring back Next.js-only extras: Klaviyo, llms.txt, shop agent, Spanish, bundles, gift cards, expert reviews

---

## 6. Decisions and re-plans

Newest first. One line each: date · trigger · decision · what changed in this file.

| Date | Trigger | Decision | Plan change |
| --- | --- | --- | --- |
| 2026-11-14 | New request (§3.5) | Stripe checkout on bicyclebio.com now, test mode first (BicycleBio only); live keys only after a test order lands in Shopify | P2.4 runs on headless-bicyclebio ahead of M1 |
| 2026-11-14 | New request (§3.5) | One codebase, one Worker per brand (headless-bicyclebio, -scooterbio, -skaterbio) via Wrangler environments; each brand gets its own Shopify Headless-channel storefront; brand picked by BRAND env var; ecombio-headless and placeholder bicyclebio-headless to be deleted | wrangler.jsonc env.bicyclebio, deploy.yml matrix, .env.bicyclebio |
| 2026-11-14 | Finding changes a decision (§3.3) | Prod domain is bicyclebio.com (not ecombio.com); prod Worker runs BicycleBio 1000185154 on khkkyb-b8; test on headless.bicyclebio.com first | §1, M4, P1.4.1, P5.3 updated; added P1.6 |
| 2026-11-14 | New request (§3.5) | Start PDP data work (`pdp.*` namespace) now, ahead of M2; UI stays in M2. P1.2.1 env check runs first | Added P3.0 and P3.1.7 |
| 2026-11-14 | New rule | Every feature gets a spec (specs/) and a validation record (validation/) | Added §0 Three documents |
| 2026-11-14 | Initial plan | Prod = khkkyb-b8, dev = ecombio; launch after holidays (Jan 5); Workers Paid; Shopify checkout default, Stripe behind a switch; keep compat layer until after launch | Created plan.md |

---

## 7. Update log

Newest first. One line per update: date · item ID · what changed · validation result.

| Date | Item | Change | Validation |
| --- | --- | --- | --- |
| 2026-11-14 | P1.6 | c78c377: headless-bicyclebio live on bicyclebio.com + www (home, collections/all, a product = 200; BicycleBio brand; khkkyb-b8 only). Deleted bicyclebio-headless and ecombio-headless; headless.bicyclebio.com retired | PASS |
| 2026-11-14 | P1.6 | Deployed 1acf964 via GitHub Actions; headless.bicyclebio.com/en-us = 200, BicycleBio, khkkyb-b8 links only | PASS (P1.6.1–.3); P1.6.4 open |
| 2026-11-14 | P1.6 | Verified: repo origin = ecombio-com/headless, main = origin/main (9fa3ce1), 21 files uncommitted; bicyclebio.com DNS on Cloudflare, apex + www point to Shopify; Worker serves Ecombio from dev store | FAIL (not BicycleBio yet) |
| 2026-11-14 | P3.0 | Spec drafted; task started | — |
| 2026-11-14 | — | Added specs/ and validation/ with templates; §0 Three documents | — |
| 2026-11-14 | — | plan.md created | — |
