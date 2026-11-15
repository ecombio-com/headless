# Headless Storefront

Shopify - Headless Storefront
Cloudflare - Workers & Pages
GitHub - Project Repository
Stripe - Payment Gateway

## Core Key Takeaways

- This Headless setup should focus on becoming domain-specific, serving as a multi-storefront across various domains such as the following: bicyclebio.com, scooterbio.com, skaterbio.com; It was derived from a general-purpose ecombio.com
- Started as a Vercel/NextJS Storefront https://vercel.shop/ C:\Users\Admin\Shopify\References\storefronts migrated to Shopify/Hydrogen Storefront https://mock.shop/ C:\Users\Admin\Shopify\Storefronts\Hydrogen
-

### Products
Product Details Page (PDP): personalized product details page?
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

### Blogs

### Pages
