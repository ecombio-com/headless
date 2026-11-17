# Plan: Sanity CMS (SanityPress)

## 1. How and why
**Why**
- Content is currently coupled to code and Shopify objects (src\lib\home.server.ts, blog.server.ts, announcements.ts, collection-hub.server.ts, menu.ts, page-blocks.ts). Marketing edits need a developer or Shopify admin workarounds.
- Three brands need distinct content with shared structure; a CMS with typed schema makes that repeatable.
- A starter (SanityPress) removes weeks of schema and Studio work: Next.js 16 App Router, Tailwind 4, prebuilt modules, embedded Studio, sitemap and RSS.

**How**
1. Scaffold SanityPress into Apps\CMS (Studio + reference frontend) against Sanity project wnpvzzyv.
2. Treat Apps\CMS as the content backend: schema, Studio, TypeGen, webhooks.
3. Add next-sanity to the storefront (Storefronts\Headless) and fetch content with a Viewer read token, server-side only.
4. Keep Shopify for commerce data; Sanity holds editorial content and references Shopify handles/IDs where needed.
5. Deploy both on Cloudflare (OpenNext/Workers); Sanity webhooks trigger revalidation or deploy hooks.

## 2. Features and capabilities
**SanityPress starter**
- Next.js 16 (App Router, RSC, TypeScript) with Tailwind 4
- Pre-configured Sanity schema and frontend components (modules)
- Visual editing in an embedded Studio (/admin)
- Auto-generated sitemap and blog RSS feed
- TypeGen type safety; VSCode snippets for schema and components
- Default content: site settings, Home, Blog page, blog post template (via the SanityPress CLI; otherwise import the demo dataset)

**Sanity platform**
- GROQ queries over a hosted Content Lake, CDN-backed API
- Datasets, roles and tokens; webhooks; CORS control
- CLI: init, dev, deploy, typegen, schema, dataset import/export, tokens, docs
- MCP server (https://mcp.sanity.io) for agent access to content and schema

## 3. Benefits and opportunities
**Benefits**
- Editors ship content without deploys or code changes
- Typed content (TypeGen) reduces runtime errors in the storefront
- Reusable modules speed up new landing pages and brand launches (see docs\brand-launch.md)
- Content history, drafts and roles give safer editing workflows

**Opportunities**
- Per-brand editorial voice on a shared schema
- Localized content (the storefront already routes by [locale])
- Richer PDP and collection hub content (guides, FAQs, comparison blocks) managed outside Shopify metafields
- Agent-assisted content operations through the Sanity MCP

## 4. Usages and benefits
Candidates are mapped from the current repo; confirm each during the content audit.
| Usage | Where it lives today (candidate) | Benefit |
|-------|----------------------------------|---------|
| Homepage modules and hero | src\lib\home.server.ts, components\home | Marketing edits without deploys |
| Blog / journal | src\lib\blog.server.ts, features\blog | Editorial workflow, RSS, authors, categories |
| Announcement bar | src\lib\announcements.ts | Instant promo changes per brand |
| Menus and mega panels | src\lib\menu.ts, components\nav | Navigation edits per brand |
| Collection hubs (guides, articles, trust bar) | src\lib\collection-hub.server.ts | Rich SEO landing content |
| Static/legal pages | features\pages, page-blocks.ts | Block-based pages without Shopify page limits |
| PDP extras (FAQ, highlights, resources) | src\lib\product-extras.server.ts | Content decoupled from metafield limits |

## 5. Minimum requirements
- Node.js 20.9 or newer (Next.js 16 requirement), pnpm, Git
- PowerShell 7 (or Windows PowerShell 5.1+) for the repo scripts
- Sanity account with access to the project (wnpvzzyv or a replacement in org o3n188bvc)
- Sanity Viewer read token (SANITY_API_READ_TOKEN)
- Env vars: NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET
- Published `site` document and `page` document with slug "index"
- Network access to the npm registry and the Sanity API
- Cloudflare account with Workers and Wrangler for deployment

## 6. Recommended requirements
- Current Node.js LTS and the latest pnpm; lockfile committed
- Separate datasets for development, staging and production
- Dataset-per-brand or a required `brand` field, decided before modeling (decision D1 in roadmap.md)
- Sanity webhooks to a Cloudflare deploy hook or revalidation endpoint
- Separate tokens: read (Viewer) for production, a preview token for drafts; never exposed to the browser; never pasted into chats or tickets
- CORS origins for every Studio and brand domain
- TypeGen in CI so schema/query drift fails the build
- Editor roles and, if SAML 2.0/OIDC SSO is required, confirm it is available on the Sanity plan
- Sanity MCP configured for Claude Code; AGENTS.md, DESIGN.md and README.md kept current
- Working Git for Windows (HTTPS remote helper) so agent skills can install
- With pnpm, declare every imported package as a direct dependency (strict node_modules), e.g. @sanity/icons
- Backups: scheduled `sanity dataset export` per dataset
