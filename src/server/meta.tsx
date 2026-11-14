// Renders react-router meta descriptors as tags. React 19 hoists <title>, <meta> and <link> into <head>.
export type MetaDescriptor = Record<string, unknown>;

export function Meta({descriptors}: {descriptors: MetaDescriptor[]}) {
  return (
    <>
      {descriptors.map((d, i) => {
        if (!d) return null;
        if ('title' in d) return <title key={i}>{String(d.title)}</title>;
        if ('script:ld+json' in d) {
          const json = d['script:ld+json'];
          if (!json) return null;
          return (
            <script
              key={i}
              type="application/ld+json"
              dangerouslySetInnerHTML={{__html: JSON.stringify(json).replace(/</g, '\\u003c')}}
            />
          );
        }
        if (d.tagName === 'link') {
          const {tagName: _t, ...attrs} = d;
          return <link key={i} {...(attrs as Record<string, string>)} />;
        }
        if ('charSet' in d) return null;
        return <meta key={i} {...(d as Record<string, string>)} />;
      })}
    </>
  );
}
