// Blog: tag page (data, SEO, view). Ported from routes/blogs.tag.$tagHandle.
import {notFound} from 'next/navigation';
import type {PageArgs} from '~/server/page';
import {seoMetadata} from '~/features/seo';
import {ArticleCard} from '~/components/blog/article-card';
import {BlogCrumbs, BlogHeader} from '~/components/blog/journal';
import {Container} from '~/components/ui/container';
import {LoadMoreGrid} from '~/components/blog/card-row';
import {Page} from '~/components/ui/page';
import {collectTags, tagToHandle} from '~/lib/blog';
import {getAllArticles, getUrls} from '~/lib/blog.server';
export async function load({context, params, request}: PageArgs<'tagHandle'>) {
  const tagHandle = params.tagHandle;
  if (!tagHandle) notFound();
  const all = await getAllArticles(context.storefront);
  const articles = all.filter((a) => a.tags.some((t) => tagToHandle(t) === tagHandle));
  const label = collectTags(articles).find((t) => t.handle === tagHandle)?.label;
  if (!label) notFound();
  return {articles, canonicalUrl: getUrls(request).canonical, label};
}

type Data = Awaited<ReturnType<typeof load>>;

export function metadata({label, canonicalUrl}: Data, {context}: PageArgs) {
  return seoMetadata({title: label, description: `Articles tagged ${label}`, url: canonicalUrl, siteName: context.storefrontConfig.name});
}

export function TagRoute({data}: {data: Data}) {
  const {articles, label} = data;
  return (
    <Page className="pt-0">
      <BlogHeader>
        <BlogCrumbs items={[{label: 'Home', href: '/'}, {label: 'Journal', href: '/blogs'}, {label}]} />
        <h1 className="max-w-3xl text-balance font-semibold text-(length:--heading-h2) tracking-tight">
          {label}
        </h1>
        <p className="font-medium text-ds-small">
          {articles.length} {articles.length === 1 ? 'article' : 'articles'}
        </p>
      </BlogHeader>
      <Container className="grid gap-4 py-(--padding-section-medium)">
        <h2 className="text-ds-small uppercase tracking-wide">The latest</h2>
        <LoadMoreGrid
          className="grid gap-(--spacer-medium) sm:grid-cols-2 lg:grid-cols-4"
          items={articles.map((article) => (
            <ArticleCard article={article} category={article.blogTitle} compact key={article.handle} />
          ))}
          pageSize={8}
        />
      </Container>
    </Page>
  );
}
