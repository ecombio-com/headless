'use client';
// Product page view (client: variant picker, buy buttons, media). Ported from Hydrogen
// routes/($locale).products.$handle.tsx (4f210ca). Data comes from ./product.ts.
import type {ProductData} from './product';
import {ProductReviews, StarRating} from '~/@yotpo';
import {Money, getProductOptions, useSelectedOptionInUrlParam} from '@shopify/hydrogen-react';
import {Analytics} from '~/components/analytics/analytics';
import {Deferred} from '~/components/ui/deferred';
import {Container} from '~/components/ui/container';
import {Page} from '~/components/ui/page';
import {Sections} from '~/components/ui/sections';
import {AddedToCartScreen} from '~/components/cart/added-to-cart-screen';
import {Breadcrumbs} from '~/components/product-detail/breadcrumbs';
import {BuyButtons} from '~/components/product-detail/buy-buttons';
import {DeliveryEstimate} from '~/components/product-detail/delivery-estimate';
import {FloatingBuyBlock} from '~/components/product-detail/floating-buy-block';
import {FrequentlyAskedQuestionsSection} from '~/components/product-detail/frequently-asked-questions-section';
import {FrequentlyBoughtTogether} from '~/components/product-detail/frequently-bought-together';
import {PairsWellWithSection} from '~/components/product-detail/pairs-well-with-section';
import {PdpBanner} from '~/components/product-detail/pdp-banner';
import {PopularSearches} from '~/components/product-detail/popular-searches';
import {ProductFormOptions, toOptionGroups} from '~/components/product-detail/product-form';
import {ProductHighlights} from '~/components/product-detail/product-highlights';
import {ProductMedia} from '~/components/product-detail/product-media';
import {ProductPrice, ProductPriceStacked} from '~/components/product-detail/product-price';
import {ProductRecap} from '~/components/product-detail/product-recap';
import {ReassuranceBar} from '~/components/product-detail/reassurance-bar';
import {RelatedArticlesSection} from '~/components/product-detail/related-articles-section';
import {SpecCarousel} from '~/components/product-detail/spec-carousel';
import {StepPicker} from '~/components/product-detail/step-picker';
import {StickyBuyBar} from '~/components/product-detail/sticky-buy-bar';
import {TechnicalSpecsSection} from '~/components/product-detail/technical-specs-section';
import {WishlistButton} from '~/components/product-detail/wishlist-button';
import {RelatedProductsSection} from '~/components/product/related-products-section';
import {TrackProductView} from '~/@algolia/components/track-product-view';
import {variantSubtitle} from '~/lib/pdp-steps';
import {specsToAtAGlance} from '~/lib/pdp-json';
import {
  getSelectedColorImage,
  getSharedImages,
  getTaggedGallery,
  hasAltTagging,
  hasColorImagePartitioning,
  toMedia,
} from '~/lib/product-media';
import '~/styles/technical-specs.css';

const COPY = {
  changeOptions: 'Change size or color',
  specsSubtitle: 'Full details in Technical Specifications below',
};

export function ProductView({data}: {data: ProductData}) {
  const {
    product,
    breadcrumbs,
    delivery,
    popularSearches,




    trustBadges,
    specs,
    pdpSteps,
    crossSell,
    extras,
    reviews,
    algolia,
  } = data;

  // The server picks the variant from the URL (options or variant slug), so this is always current.
  const selectedVariant = product.selectedOrFirstAvailableVariant!;
  // Descriptive-URL products keep the address clean; others mirror options into ?Size=&Color=.
  useSelectedOptionInUrlParam(pdpSteps?.urlTemplate ? [] : selectedVariant.selectedOptions);
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml} = product;
  const {minVariantPrice: pMin, maxVariantPrice: pMax} = product.priceRange;
  const {minVariantPrice: cMin, maxVariantPrice: cMax} = product.compareAtPriceRange;
  const uniform =
    pMin.amount === pMax.amount &&
    pMin.currencyCode === pMax.currencyCode &&
    cMin.amount === cMax.amount;
  const hasOptions = productOptions.some((o) => o.optionValues.length > 1);

  // Color products show the selected color's image first and hide the other colors' images.
  const optionGroups = toOptionGroups(productOptions);
  const {images, videos} = toMedia(product.media.nodes);
  // Photos tagged in their alt text ("Title | Color: Blue") follow every option; otherwise only Color does.
  const tagged = hasAltTagging(images);
  const partitioned = !tagged && hasColorImagePartitioning(optionGroups);
  const mediaImages = tagged
    ? getTaggedGallery(images, selectedVariant?.selectedOptions ?? [], selectedVariant?.image)
    : partitioned
      ? getSharedImages(images, optionGroups)
      : images;
  const colorImage = partitioned
    ? getSelectedColorImage(optionGroups, [
        ...images,
        ...(selectedVariant?.image ? [selectedVariant.image] : []),
      ])
    : undefined;
  const heading = pdpSteps?.heading;
  const variantName = selectedVariant?.selectedOptions
    ?.map((o) => o.value)
    .filter((v) => v !== 'Default Title')
    .join(' / ');

  return (
    <Page className="pt-0">
      <Container className="bg-background pt-6 md:pt-8">
        <Sections>
          <Breadcrumbs items={breadcrumbs} className="pb-4 md:pb-6" />
          <div className="grid gap-ds-large lg:grid-cols-10 lg:items-start lg:gap-5">
            <ProductMedia
              images={mediaImages}
              videos={videos}
              colorImage={colorImage}
              title={title}
              className="lg:sticky lg:top-20 lg:col-span-6 lg:self-start"
            />
            <div className="grid gap-10 lg:col-span-4">
              {heading ? (
                <div className="grid gap-6" data-slot="product-info-bm">
                  <div>
                    <h1 className="flex flex-col gap-1">
                      <span className="text-ds-h3 font-semibold leading-tight text-foreground">
                        {heading.name}
                        {heading.tag ? <> &bull; {heading.tag}</> : null}
                      </span>
                      <span className="text-ds-regular font-normal text-foreground/80">
                        {variantSubtitle(selectedVariant?.selectedOptions, heading.subtitleOrder)}
                      </span>
                    </h1>
                    <div className="mt-2 min-h-5">
                      <Deferred value={reviews} fallback={<div className="h-5" aria-hidden />}>
                          {(data) => (
                            <StarRating
                              compact
                              summary={
                                data
                                  ? {
                                      averageScore: data.bottomline.average_score,
                                      totalReviews: data.bottomline.total_review,
                                    }
                                  : null
                              }
                            />
                          )}
                        </Deferred>
                    </div>
                  </div>
                  <FloatingBuyBlock>
                    <div className="flex flex-wrap items-center gap-3">
                      {selectedVariant ? (
                        <ProductPriceStacked
                          className="grow"
                          amount={selectedVariant.price.amount}
                          currencyCode={selectedVariant.price.currencyCode}
                          compareAtAmount={selectedVariant.compareAtPrice?.amount}
                        />
                      ) : null}
                      <div className="flex min-w-0 grow items-center gap-3">
                        <div className="min-w-[164px] max-w-[256px] grow">
                          <BuyButtons
                            selectedVariant={selectedVariant}
                            availableForSale={product.availableForSale}
                            quantityPicker={false}
                          />
                        </div>
                        <WishlistButton productHandle={product.handle} />
                      </div>
                    </div>
                  </FloatingBuyBlock>
                  <DeliveryEstimate delivery={delivery} />
                </div>
              ) : (
              <div
                className="grid data-[uniform-price=true]:gap-10"
                data-uniform-price={uniform}
              >
                <div data-slot="product-info-header">
                  <h1 className="text-foreground text-ds-h3 font-semibold leading-tight">
                    {title}
                  </h1>
                  {product.vendor ? (
                    <p className="mt-ds-xxsmall text-ds-regular text-muted-foreground">
                      {product.vendor}
                    </p>
                  ) : null}
                  <div className="mt-ds-xsmall min-h-5">
                    <Deferred value={reviews} fallback={<div className="h-5" aria-hidden />}>
                        {(data) => (
                          <StarRating
                            summary={
                              data
                                ? {
                                    averageScore: data.bottomline.average_score,
                                    totalReviews: data.bottomline.total_review,
                                  }
                                : null
                            }
                          />
                        )}
                      </Deferred>
                  </div>
                  {uniform ? (
                    <ProductPrice
                      amount={pMin.amount}
                      currencyCode={pMin.currencyCode}
                      compareAtAmount={cMin.amount}
                    />
                  ) : null}
                  <DeliveryEstimate delivery={delivery} />
                </div>
                <div className="grid gap-10">
                  {!uniform && selectedVariant ? (
                    <div data-slot="product-info-price">
                      <ProductPrice
                        amount={selectedVariant.price.amount}
                        currencyCode={selectedVariant.price.currencyCode}
                        compareAtAmount={selectedVariant.compareAtPrice?.amount}
                      />
                    </div>
                  ) : null}
                  {hasOptions && pdpSteps ? (
                    <a href="#pdp-steps" className="text-ds-regular underline">
                      {COPY.changeOptions}
                    </a>
                  ) : hasOptions ? (
                    <ProductFormOptions options={productOptions} />
                  ) : null}
                  <FloatingBuyBlock>
                    <BuyButtons
                      selectedVariant={selectedVariant}
                      availableForSale={product.availableForSale}
                    />
                  </FloatingBuyBlock>
                </div>
              </div>
              )}
              <ProductHighlights part="badges" badges={trustBadges} />
              {/* At a glance: pdp.specs JSON when present, else the older product_specs entries. */}
              <Deferred
                value={extras}
                fallback={specs.length ? <SpecCarousel specs={specs} subtitle={COPY.specsSubtitle} /> : null}
              >
                {(x) => {
                  const glance = specsToAtAGlance(x.specs);
                  return <SpecCarousel specs={glance.length ? glance : specs} subtitle={COPY.specsSubtitle} />;
                }}
              </Deferred>
            </div>
          </div>

          {hasOptions && pdpSteps ? (
            <StepPicker
              selectedOptions={selectedVariant?.selectedOptions ?? []}
              config={pdpSteps}
              options={productOptions}
              images={[...(colorImage ? [colorImage] : []), ...mediaImages]}
              variantKey={selectedVariant?.id}
              title={title}
            />
          ) : null}

          {heading && pdpSteps ? (
            <ProductRecap
              name={`${heading.name}${heading.tag ? ` \u2022 ${heading.tag}` : ''}`}
              colorHex={
                productOptions
                  .find((o) => o.name === 'Color')
                  ?.optionValues.find((v) => v.selected)?.swatch?.color ?? null
              }
              chips={[
                ...(pdpSteps.recap?.chips ?? []),
                ...(selectedVariant?.selectedOptions ?? [])
                  .filter((o) => o.value !== 'Default Title')
                  .map((o) => o.value),
              ]}
              images={[...(colorImage ? [colorImage] : []), ...mediaImages]}
              selectedVariant={selectedVariant}
              availableForSale={product.availableForSale}
              delivery={delivery}
              recap={pdpSteps.recap}
              extras={extras}
            />
          ) : null}

          {/* Back Market layout: the recap block replaces the description for pdp_steps products. */}
          {descriptionHtml && !(heading && pdpSteps) ? (
            <div className="mt-ds-large grid gap-10 [&_*]:max-w-none">
              <div data-slot="product-info-description">
                <div
                  className="prose prose-sm text-foreground/80"
                  dangerouslySetInnerHTML={{__html: descriptionHtml}}
                />
              </div>
            </div>
          ) : null}

          {product.isGiftCard ? null : (
            <Deferred value={crossSell} fallback={null}>
                {(data) => (
                  <>
                    {data.frequentlyBought.length > 0 && selectedVariant?.availableForSale ? (
                      <FrequentlyBoughtTogether
                        items={data.frequentlyBought}
                        main={{
                          imageUrl: selectedVariant.image?.url,
                          price: selectedVariant.price,
                          subtitle: variantName || undefined,
                          title: product.title,
                          variantId: selectedVariant.id,
                        }}
                      />
                    ) : null}
                    <RelatedProductsSection products={data.related} limit={4} />
                    <PairsWellWithSection products={data.complementary} />
                  </>
                )}
              </Deferred>
          )}
          <AddedToCartScreen
            crossSell={crossSell}
            item={{
              imageAlt: selectedVariant?.image?.altText ?? product.title,
              imageUrl: selectedVariant?.image?.url,
              subtitle: variantName || undefined,
              title: product.title,
            }}
          />
          <div id="reviews" className="scroll-mt-24">
            <Deferred value={reviews} fallback={<div className="min-h-64" aria-hidden />}>
                {(data) => (
                  <ProductReviews
                    data={data}
                    handle={product.handle}
                    productTitle={product.title}
                  />
                )}
              </Deferred>
          </div>
          <Deferred value={extras} fallback={null}>{(x) => <FrequentlyAskedQuestionsSection html={x.faqBody} faq={x.faq} />}</Deferred>
          <PopularSearches terms={popularSearches} />
          <Deferred value={extras} fallback={null}>{(x) => <TechnicalSpecsSection html={x.techSpecsBody} specs={x.specs} title={product.title} />}</Deferred>
          {/* TEMP hidden: <Deferred value={extras} fallback={null}>{(x) => <ProductResources manualUrl={x.manualUrl} videoUrl={x.assemblyVideoUrl} />}</Deferred> */}
          <Deferred value={extras} fallback={null}>{(x) => <RelatedArticlesSection articles={x.relatedArticles} />}</Deferred>
          <Deferred value={extras} fallback={null}>{(x) => <PdpBanner banner={x.promoBanner} />}</Deferred>
          <Deferred value={extras} fallback={null}>{(x) => <ReassuranceBar items={x.reassurance} />}</Deferred>
        </Sections>
      </Container>

      {product.isGiftCard ? null : (
        <StickyBuyBar
          targetId="primary-buy-buttons"
          title={product.title}
          variantName={variantName}
          imageUrl={selectedVariant?.image?.url ?? product.featuredImage?.url}
          price={selectedVariant?.price ? <Money data={selectedVariant.price} /> : null}
        />
      )}
      <TrackProductView config={algolia} productId={product.id} />
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </Page>
  );
}
