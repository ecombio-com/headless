// Product pages (/products/<handle> and Back Market-style variant URLs): data, SEO and structured data.
// The view is product-view.tsx. Ported from Hydrogen routes/($locale).products.$handle.tsx (4f210ca).
import 'server-only';
import {notFound, permanentRedirect} from 'next/navigation';
import type {Metadata} from 'next';
import {getSelectedProductOptions} from '~/core/shopify/product-options';
import {getLocaleFromRequest} from '~/core/config/i18n';
import {getCollectionTrail} from '~/lib/breadcrumb-trail';
import {loadProductExtras} from '~/lib/product-extras.server';
import {PRODUCT_QUERY, VARIANT_URL_QUERY} from '~/lib/product-fragments';
import {fillUrlTemplate, parsePdpSteps} from '~/lib/pdp-steps';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {parseDelivery, parsePopularSearches, parseSpecs, parseTrustBadges} from '~/lib/product';
import {loadCrossSell} from '~/lib/product-cross-sell';
import {toPublicAlgoliaConfig} from '~/@algolia/config';
import {seoMetadata} from '~/features/seo';
import type {PageArgs} from '~/server/page';

export async function loadProduct({context, params, request}: PageArgs<'handle'>) {
  const {storefront} = context;
  const {handle} = params;

  if (!handle) {
    notFound();
  }

  let selectedOptions = getSelectedProductOptions(request);
  let {product} = await storefront.query(PRODUCT_QUERY, {
    variables: {handle, selectedOptions},
  });

  // Not a product handle? It may be a Back Market-style variant URL
  // (e.g. aventon-pace-4-large-step-through-blue-steel-electric-cruiser-bike).
  let variantSlug: string | null = null;
  if (!product?.id) {
    const cachedLookup = await storefront.query(VARIANT_URL_QUERY, {
      variables: {slug: handle},
      cache: storefront.CacheLong(),
    });
    // A cached miss may be stale (entry just created): check once more without the cache.
    const {metaobject} = cachedLookup.metaobject
      ? cachedLookup
      : await storefront.query(VARIANT_URL_QUERY, {
          variables: {slug: handle},
          cache: storefront.CacheNone(),
        });
    const baseHandle = metaobject?.product?.reference?.handle;
    let options: Record<string, string> | null = null;
    try {
      options = metaobject?.options?.value ? (JSON.parse(metaobject.options.value) as Record<string, string>) : null;
    } catch {
      options = null;
    }
    if (baseHandle && options) {
      variantSlug = handle;
      selectedOptions = Object.entries(options).map(([name, value]) => ({name, value}));
      ({product} = await storefront.query(PRODUCT_QUERY, {
        variables: {handle: baseHandle, selectedOptions},
      }));
    }
  }

  if (!product?.id) {
    notFound();
  }

  // The API handle might be localized, so redirect to the localized handle
  if (!variantSlug) redirectIfHandleIsLocalized(request, {handle, data: product});

  const origin = new URL(request.url).origin;
  const prefix = getLocaleFromRequest(request).pathPrefix;
  const pdpSteps = parsePdpSteps(product.pdpSteps?.value);

  // Products with a urlTemplate: old ?Size=&Color= links move permanently to the descriptive variant URL.
  if (pdpSteps?.urlTemplate && !variantSlug) {
    const url = new URL(request.url);
    const optionNames = new Set(product.options.map((o) => o.name));
    const hasOptionParams = [...url.searchParams.keys()].some((k) => optionNames.has(k));
    const selected = product.selectedOrFirstAvailableVariant?.selectedOptions;
    const slug = selected ? fillUrlTemplate(pdpSteps.urlTemplate, selected) : null;
    if (hasOptionParams && slug) {
      for (const k of optionNames) url.searchParams.delete(k);
      const rest = url.searchParams.toString();
      permanentRedirect(`${prefix}/products/${slug}${rest ? `?${rest}` : ''}`);
    }
  }

  const trail = getCollectionTrail(product.collections.nodes);
  const crumbs = [
    {name: 'Home', path: '/'},
    ...trail.map((c) => ({name: c.title, path: `/collections/${c.handle}`})),
    // Back Market style: the last crumb is the short model name from the H1,
    // and on a variant page it points at that variant page.
    {
      name: pdpSteps?.heading
        ? `${pdpSteps.heading.name}${pdpSteps.heading.tag ? ` • ${pdpSteps.heading.tag}` : ''}`
        : product.title,
      path: `/products/${variantSlug ?? product.handle}`,
    },
  ];
  const abs = (p: string) => `${origin}${prefix}${p === '/' ? '' : p}`;

  // Star rating for Google (Shopify's standard reviews.rating / reviews.rating_count fields).
  let rating: {value: number; count: number} | null = null;
  try {
    const value = Number((JSON.parse(product.ratingValue?.value ?? 'null') as {value?: unknown} | null)?.value);
    const count = Number(product.ratingCount?.value);
    if (value > 0 && count > 0) rating = {value, count};
  } catch {
    rating = null;
  }

  // Back Market-style snippet for a variant page: "Aventon Pace 4 Step-Through Large - Blue Steel - Class 2"
  const v = product.selectedOrFirstAvailableVariant;
  const variantSeo =
    variantSlug && v && pdpSteps?.heading
      ? (() => {
          const values = v.selectedOptions.map((o) => o.value).filter((x) => x !== 'Default Title');
          const name = [pdpSteps.heading.name, values.join(' - ')].join(' ');
          const title = pdpSteps.heading.tag ? `${name} - ${pdpSteps.heading.tag}` : name;
          const lead = `${pdpSteps.heading.name}${pdpSteps.heading.tag ? ` (${pdpSteps.heading.tag})` : ''} in ${values.join(', ')}.`;
          const description = `${lead} ${product.description}`.replace(/\s+/g, ' ').trim().slice(0, 155);
          return {title, description, variant: v};
        })()
      : null;

  const productId = product.id.split('/').pop() ?? '';

  return {
    // Variant pages (descriptive URL) are their own Google page; the plain URL is the model page.
    canonicalUrl: abs(`/products/${variantSlug ?? product.handle}`),
    variantSeo,
    rating,
    product,
    breadcrumbs: crumbs,
    breadcrumbLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [{name: context.storefrontConfig.name, path: '/'}, ...crumbs.slice(1)].map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: abs(c.path),
      })),
    },
    delivery: parseDelivery(product.policyDays?.reference ?? {}),
    popularSearches: parsePopularSearches(product.popularSearches),
    trustBadges: parseTrustBadges(product.policyBadges?.reference?.badges),
    specs: parseSpecs(product.specs),
    pdpSteps,
    // Below the fold: streamed to the client as promises.
    reviews: context.yotpo.getProductReviews(productId),
    crossSell: loadCrossSell(context.storefront, product.handle),
    extras: loadProductExtras(context.storefront, product.handle),
    algolia: toPublicAlgoliaConfig(context.algolia.config),
  };
}
export type ProductData = Awaited<ReturnType<typeof loadProduct>>;

export function productMetadata({product, canonicalUrl, variantSeo}: ProductData, {context}: PageArgs): Metadata {
  const brand = context.storefrontConfig.name;
  return seoMetadata({
    title: variantSeo ? `${variantSeo.title} | ${brand}` : product.seo?.title || product.title,
    description: variantSeo?.description || product.seo?.description || product.description || '',
    image: variantSeo?.variant.image?.url ?? product.featuredImage?.url,
    url: canonicalUrl,
    siteName: brand,
  });
}

/** Open Graph product price/stock tags (rendered as <meta property>). */
export function productMetaTags({product, variantSeo}: ProductData): Record<string, string> {
  const price = variantSeo?.variant.price ?? product.priceRange.minVariantPrice;
  const inStock = variantSeo ? variantSeo.variant.availableForSale : product.availableForSale;
  return {
    'og:price:amount': price.amount,
    'og:price:currency': price.currencyCode,
    'og:availability': inStock ? 'instock' : 'oos',
    'product:price:amount': price.amount,
    'product:price:currency': price.currencyCode,
    'product:availability': inStock ? 'in stock' : 'out of stock',
  };
}

export function productJsonLd({product, canonicalUrl, breadcrumbLd, variantSeo, rating}: ProductData) {
  const vs = variantSeo;
  const price = vs?.variant.price ?? product.priceRange.minVariantPrice;
  const inStock = vs ? vs.variant.availableForSale : product.availableForSale;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: vs?.title ?? product.title,
      description: product.description,
      image: product.media.nodes.flatMap((m: any) => ('image' in m && m.image ? [m.image.url] : [])),
      ...(product.vendor ? {brand: {'@type': 'Brand', name: product.vendor}} : {}),
      ...(rating
        ? {aggregateRating: {'@type': 'AggregateRating', ratingValue: rating.value, reviewCount: rating.count}}
        : {}),
      offers: vs
        ? {
            '@type': 'Offer',
            price: price.amount,
            priceCurrency: price.currencyCode,
            availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
            url: canonicalUrl,
            ...(vs.variant.sku ? {sku: vs.variant.sku} : {}),
          }
        : {
            '@type': 'AggregateOffer',
            priceCurrency: price.currencyCode,
            lowPrice: price.amount,
            highPrice: product.priceRange.maxVariantPrice.amount,
            offerCount: product.variantsCount?.count ?? 1,
            availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: canonicalUrl,
          },
      sku: product.id,
    },
    breadcrumbLd,
  ];
}
