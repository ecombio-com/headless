// Blog: journal page (data, SEO, view). Ported from routes/blogs._index.
import type {PageArgs} from '~/server/page';
import {seoMetadata} from '~/features/seo';
import {Container} from '~/components/ui/container';
import {JournalHero, JournalSectionBlock, TagChips} from '~/components/blog/journal';
import {Page} from '~/components/ui/page';
import {collectTags, FALLBACK_SECTION_ID, groupIntoSections, type JournalEntry} from '~/lib/blog';
import {getBlog, getBlogList, getUrls} from '~/lib/blog.server';
const TITLE = 'Journal: E-Bike Guides, Tips & Stories';

const DESCRIPTION =
  'Electric bike buying guides, maintenance tips and rider stories from Ecombio. Find the right e-bike and keep it running great.';

export async function load({context, request}: PageArgs) {
  const {storefront} = context;
  const blogs = await getBlogList(storefront);
  const loaded = await Promise.all(blogs.map((b) => getBlog(storefront, b.handle, 50)));

  const seen = new Set<string>();
  const entries: JournalEntry[] = [];
  for (const blog of loaded) {
    if (!blog) continue;
    for (const article of blog.articles) {
      if (seen.has(article.handle)) continue;
      seen.add(article.handle);
      entries.push({article, category: blog.title});
    }
  }
  entries.sort((a, b) => Date.parse(b.article.publishedAt) - Date.parse(a.article.publishedAt));

  const sections = groupIntoSections(entries);
  return {
    canonicalUrl: getUrls(request).canonical,
    jumps: sections
      .filter((s) => s.id !== FALLBACK_SECTION_ID)
      .map((s) => ({href: `#${s.id}`, label: s.title})),
    sections,
    tags: collectTags(entries.map((e) => e.article)).slice(0, 12),
  };
}

type Data = Awaited<ReturnType<typeof load>>;

export function metadata(data: Data, {context}: PageArgs) {
  return seoMetadata({title: TITLE, description: DESCRIPTION, url: data.canonicalUrl, siteName: context.storefrontConfig.name});
}

export function JournalIndex({data}: {data: Data}) {
  const {jumps, sections, tags} = data;
  return (
    <Page className="pt-0">
      <JournalHero
        jumps={jumps}
        subtitle="Buying guides, maintenance tips and stories for every e-bike rider."
        title="The Ecombio Journal"
      />
      {sections.length > 0 ? (
        sections.map((section) => <JournalSectionBlock key={section.id} section={section} />)
      ) : (
        <Container className="py-(--padding-section-medium)">
          <p className="text-center text-muted-foreground">No articles found.</p>
        </Container>
      )}
      {tags.length > 0 ? (
        <Container className="grid justify-items-center gap-(--spacer-regular) py-(--padding-section-medium)">
          <h2 className="font-(family-name:--font-heading) font-semibold text-(length:--heading-h2) tracking-tight">
            All topics
          </h2>
          <TagChips tags={tags} />
        </Container>
      ) : null}
    </Page>
  );
}
