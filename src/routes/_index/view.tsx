'use client';
// Ported from ($locale)._index.tsx by scripts/split-route.mjs.
import type {loader} from './server';
import {useLoaderData} from '~/compat/router';
import type {Route} from '~/server/route-types';
import {CategoryCarousel} from '~/components/home/category-carousel';
import {FeatureSplit} from '~/components/home/feature-split';
import {Hero} from '~/components/home/hero';
import {VideoFeature} from '~/components/home/video-feature';
import {HomeShowcaseTabs} from '~/components/home/home-showcase-tabs';
import {NewsletterSection} from '~/components/home/newsletter-section';
import {PopularCategories} from '~/components/home/popular-categories';
import {StudyCarousel} from '~/components/home/study-carousel';
import {VideoCarousel} from '~/components/home/video-carousel';
import {Container} from '~/components/ui/container';
import {Page} from '~/components/ui/page';
import {Sections} from '~/components/ui/sections';
import {BicycleBioHome} from '~/components/home/BicycleBioHome';
import {BrandHome} from '~/components/home/BrandHome';
import {shopCategories} from '~/lib/home';


export default function HomeRoute() {
  const data = useLoaderData<typeof loader>();
  if ((data as any).isBrandHome) return <BrandHome slug={(data as any).brandSlug} products={(data as any).products ?? []} pageInfo={(data as any).pageInfo} />;
  return data.isBicycleBio ? <BicycleBioHome /> : <EcombioHome />;
}

function EcombioHome() {
  const {categorySections, shopCategories: categories, homeVideo, showcase, slides, stories, studies} =
    useLoaderData<typeof loader>();
  return (
    <Page className="pt-0">
      <Sections>
        <Hero slides={slides} />

        <Container>
          <CategoryCarousel title="Shop by category" items={categories} />
        </Container>

        {showcase ? (
          <Container>
            <HomeShowcaseTabs
              title={showcase.title}
              subtitle={showcase.subtitle}
              tabs={showcase.tabs}
              initialProducts={showcase.initialProducts}
            />
          </Container>
        ) : null}

        {categorySections.map((section: any) => (
          <Container key={section.id}>
            <PopularCategories title={section.title} subtitle={section.subtitle} items={section.items} />
          </Container>
        ))}

        <Container>
          <VideoCarousel title="Community stories" items={stories} />
        </Container>

        <Container>
          <StudyCarousel title="Guides and articles" items={studies} />
        </Container>

        <Container>
          <NewsletterSection privacyHref="/policies/privacy-policy" />
        </Container>

        <Container>
          <div className="flex flex-col gap-ds-large md:gap-ds-xxlarge">
            <FeatureSplit
              title="Trade in your old ride"
              description="Get credit toward your next e-bike when you trade in the one you are not using."
              ctaLabel="Get started"
              href="/pages/trade-in"
              imageSide="left"
              background="transparent"
              image={{
                src: 'https://cdn.shopify.com/s/files/1/0726/0641/7110/files/site-home-trade-in.webp?v=1791494937',
                alt: 'Cash falling from the sky',
              }}
            />
            <FeatureSplit
              title="We are B-Corp certified"
              description="Being a B-Corp means we hold ourselves to high standards, from our environmental impact to our hiring practices."
              ctaLabel="Read more"
              href="/pages/our-impact"
              imageSide="right"
              background="transparent"
              image={{
                src: 'https://cdn.shopify.com/s/files/1/0726/0641/7110/files/site-home-b-corp.webp?v=1791494934',
                alt: 'Certified B Corporation',
              }}
            />
            {homeVideo ? (
              <VideoFeature
                title={homeVideo.title}
                description={homeVideo.description}
                videoUrl={homeVideo.videoUrl}
                videoTitle={homeVideo.title}
              />
            ) : null}
          </div>
        </Container>
      </Sections>
    </Page>
  );
}
