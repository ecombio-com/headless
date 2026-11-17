# Roadmap: Sanity CMS (SanityPress)

Status key: NOT STARTED❌ | DONE✅ | IN PROGRESS⚠️
Created: 2026-11-16. Target dates are proposed.

## Project
Sanity CMS for BicycleBio, ScooterBio and SkaterBio headless storefronts (Shopify + Cloudflare Workers + Stripe).

## Milestones
| ID | Milestone | Target | Status |
|----|-----------|--------|--------|
| M1 | Studio running locally from Apps\CMS | 2026-11-18 | IN PROGRESS⚠️ |
| M2 | One brand reads Sanity content locally and in preview | 2026-11-25 | NOT STARTED❌ |
| M3 | Content model covers all three brands | 2026-12-04 | NOT STARTED❌ |
| M4 | Webhooks, preview and deployments live | 2026-12-11 | NOT STARTED❌ |
| M5 | Production cutover, brand by brand | 2026-12-18 | NOT STARTED❌ |

## Phase 0: Foundation (Nov 16-18) -> M1
| ID | Task | Sub-tasks | Status |
|----|------|-----------|--------|
| 0.1 | Create Sanity project from the SanityPress template | Click template link; project wnpvzzyv created | DONE✅ |
| 0.2 | Create Apps\CMS folder | Folder created at C:\Users\Admin\Shopify\Apps\CMS | DONE✅ |
| 0.3 | Fix project access | Re-login with GitHub; `projects list` shows wnpvzzyv | DONE✅ |
| 0.4 | Step 1: Initialize template | `pnpm create sanity@latest` into Apps\CMS (TypeScript, MCP for Claude Code) | DONE✅ |
| 0.5 | Step 2: Environment variables | .env.local created by init; Live Preview token generated | DONE✅ |
| 0.6 | Step 3: Install and run | `pnpm install` done; dev server starts; verify :3000 and :3000/admin | IN PROGRESS⚠️ |
| 0.7 | Step 4: Seed content | Query `site`/`page` docs; import demo dataset if empty; publish `site` and `page` "index" | IN PROGRESS⚠️ |
| 0.8 | Token hygiene | Revoke token exposed in terminal output; recreate unseen for the storefront | IN PROGRESS⚠️ |

## Phase 1: Storefront integration (Nov 19-25) -> M2
| ID | Task | Sub-tasks | Status |
|----|------|-----------|--------|
| 1.1 | Branch and dependencies | Branch feat/sanity-cms from main; `pnpm add next-sanity @sanity/image-url` | NOT STARTED❌ |
| 1.2 | Env and secrets | Add vars to .env.local and brand env files; Worker secrets per brand | NOT STARTED❌ |
| 1.3 | Sanity client module | src\lib\sanity (client, image URL builder, fetch helper); server-only token | NOT STARTED❌ |
| 1.4 | First content slice | Announcement bar from Sanity on one brand; fallback to current source | NOT STARTED❌ |
| 1.5 | TypeGen | `sanity schema extract`; `sanity typegen generate`; commit generated types | NOT STARTED❌ |

## Phase 2: Content model and migration (Nov 30-Dec 4) -> M3
| ID | Task | Sub-tasks | Status |
|----|------|-----------|--------|
| 2.1 | Decision D1: dataset strategy | Dataset per brand vs `brand` field; decide and record in specs\tech-stack.md | NOT STARTED❌ |
| 2.2 | Content audit | List content in home, blog, menu, collection hub, pages, PDP extras | NOT STARTED❌ |
| 2.3 | Schema work | Adapt SanityPress modules; add brand, locale and Shopify-handle reference fields | NOT STARTED❌ |
| 2.4 | Migrate content | Blog, pages, homepage modules, menus; verify per brand | NOT STARTED❌ |
| 2.5 | Replace data sources | Swap src\lib *.server.ts readers to Sanity behind feature flags | NOT STARTED❌ |

## Phase 3: Delivery, preview and ops (Dec 7-11) -> M4
| ID | Task | Sub-tasks | Status |
|----|------|-----------|--------|
| 3.1 | Step 5: Deployments | Replace Vercel/Netlify widget with Cloudflare deploy hook | NOT STARTED❌ |
| 3.2 | Webhooks and revalidation | Sanity webhook -> revalidate endpoint or deploy hook; verify latency | NOT STARTED❌ |
| 3.3 | Draft preview and visual editing | Preview token; draft mode route; embedded Studio | NOT STARTED❌ |
| 3.4 | Access and security | CORS origins; editor roles; confirm SSO/SAML plan availability | NOT STARTED❌ |
| 3.5 | Agent tooling | Fix Git libcurl error, install Sanity agent skills; AGENTS.md, DESIGN.md, README.md updates | NOT STARTED❌ |

## Phase 4: Launch (Dec 14-18) -> M5
| ID | Task | Sub-tasks | Status |
|----|------|-----------|--------|
| 4.1 | Step 6: Customize | Brand styling and module tweaks per brand | NOT STARTED❌ |
| 4.2 | Validation | Lighthouse/CWV, redirects (scripts\check-redirects.ps1), SEO, sitemap | NOT STARTED❌ |
| 4.3 | Backups | Scheduled `sanity dataset export` per dataset | NOT STARTED❌ |
| 4.4 | Cutover | BicycleBio -> ScooterBio -> SkaterBio; rollback via feature flags | NOT STARTED❌ |
| 4.5 | Editor handoff | Short editor guide; role assignments | NOT STARTED❌ |

## Risks
- Template ships Vercel/Netlify deploy widgets; Cloudflare path needs custom work (3.1).
- Dual content sources during migration; mitigate with feature flags and fallbacks (2.5).
- Git HTTPS remote helper fails in some child processes (libcurl-4.dll); blocks agent skills install (3.5).
