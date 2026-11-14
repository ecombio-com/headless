// SEO helpers for native pages: Next.js Metadata + JSON-LD.
import type {Metadata} from 'next';

export function seoMetadata({
  title,
  description,
  url,
  image,
  type = 'website',
  siteName,
}: {
  title: string;
  description?: string | null;
  url: string;
  image?: string | null;
  type?: 'website' | 'article';
  siteName: string;
}): Metadata {
  const images = image ? [image] : undefined;
  return {
    title,
    description: description ?? undefined,
    alternates: {canonical: url},
    openGraph: {type, siteName, title, description: description ?? undefined, url, images},
    twitter: {card: 'summary_large_image', title, description: description ?? undefined, images},
  };
}

/** Renders one or more JSON-LD objects. */
export function JsonLd({data}: {data: unknown | unknown[]}) {
  const items = (Array.isArray(data) ? data : [data]).filter(Boolean);
  return (
    <>
      {items.map((item, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(item).replace(/</g, '\\u003c')}} />
      ))}
    </>
  );
}

/** <meta property="…"> tags that the Metadata API can't express (e.g. product:price:amount). React hoists them into <head>. */
export function MetaProperties({tags}: {tags: Record<string, string>}) {
  return (
    <>
      {Object.entries(tags).map(([property, content]) => (
        <meta key={property} property={property} content={content} />
      ))}
    </>
  );
}
