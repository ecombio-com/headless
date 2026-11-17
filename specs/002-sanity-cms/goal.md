# Goal: Sanity CMS (SanityPress) for the headless storefronts

Source: https://sanitypress.dev/docs/get-started (not limited to it)

## Objective
Stand up Sanity as the headless CMS for the BicycleBio, ScooterBio and SkaterBio storefronts so content (pages, blog, homepage modules, announcements, menus) is edited by non-developers in a Studio and rendered by the existing Next.js storefront on Cloudflare Workers, without changing Shopify as the commerce source of truth or Stripe as the payment gateway.

## Baseline: the 6 SanityPress steps
| # | Step | Outcome |
|---|------|---------|
| 1 | Initialize the template | SanityPress scaffolded into Apps\CMS, linked to Sanity project wnpvzzyv |
| 2 | Set environment variables | NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_READ_TOKEN |
| 3 | Install and start the local server | Frontend on :3000, Studio on :3000/admin |
| 4 | Add content to the Studio | `site` and `page` (slug "index") published; else the frontend is blank |
| 5 | Set up deployments | Studio-triggered deploys (template default is a Vercel/Netlify widget; we use Cloudflare) |
| 6 | Customize | Schema, modules and styles adapted per brand |

## Beyond the 6 steps (in scope)
- Storefront integration through next-sanity (queries, image URLs, caching/revalidation)
- TypeGen for typed GROQ queries and schema
- Multi-brand content strategy (dataset per brand or a brand field)
- Draft preview and visual editing
- Webhooks from Sanity to Cloudflare deploy or revalidation
- Roles and access for editors; CORS per brand domain
- Sanity MCP for Claude Code; AGENTS.md, DESIGN.md and README.md for coding agents
- Content migration from Shopify pages/blog where applicable

## Out of scope
- Replacing Shopify products, cart or checkout
- Replacing Better Auth customer sign-in (Studio editors authenticate with Sanity, not storefront auth)

## Success criteria
1. Studio runs locally and in production; editors can publish without a developer.
2. At least one brand renders live Sanity content in production on Cloudflare.
3. Publishing in Sanity updates the live site within an agreed window (target: under 5 minutes).
4. Read token is stored only as a Worker secret / gitignored env file.
5. Lighthouse and Core Web Vitals on migrated pages are no worse than today.
