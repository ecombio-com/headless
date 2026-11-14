// Path: src/lib/pdp-json.ts
// Turns the JSON product-page fields (custom.specs, custom.faq) into what the existing PDP sections render:
//   - At a glance cards (ProductSpec[]), the Technical Specifications HTML, and FAQ accordions.
// JSON wins when it passes the schema; otherwise the page falls back to the older page-based fields.
import {parseFaq, parseSpecs as parseSpecsJson, type Faq, type Specs} from '~/lib/pdp-schema';
import type {ProductSpec} from '~/lib/product';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function readSpecsJson(value: string | null | undefined, handle: string): Specs | null {
  return parseSpecsJson(value, handle);
}

export function readFaqJson(value: string | null | undefined, handle: string): Faq | null {
  return parseFaq(value, handle);
}

/** "At a glance" cards from custom.specs.atAGlance. */
export function specsToAtAGlance(specs: Specs | null): ProductSpec[] {
  return (specs?.atAGlance ?? []).map((t) => ({label: t.label, value: t.value, tooltip: t.tooltip}));
}

/** Technical Specifications HTML (same classes as technical-specs.css): summary tiles, grouped rows, in the box. */
export function specsToHtml(specs: Specs | null): string | null {
  if (!specs) return null;
  const parts: string[] = [];
  if (specs.summary?.length) {
    parts.push(
      `<ul class="ds-specs-tiles">${specs.summary
        .map((t) => `<li><b>${esc(t.value)}</b><span>${esc(t.label)}</span></li>`)
        .join('')}</ul>`,
    );
  }
  for (const g of specs.groups ?? []) {
    if (g.title) parts.push(`<h3 class="ds-specs-muted">${esc(g.title)}</h3>`);
    parts.push(
      `<dl>${g.rows.map((r) => `<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('')}</dl>`,
    );
  }
  if (specs.inTheBox?.length) {
    parts.push(`<h3 class="ds-specs-muted">In the box</h3>`);
    parts.push(`<dl>${specs.inTheBox.map((i) => `<div><dt>${esc(i)}</dt><dd></dd></div>`).join('')}</dl>`);
  }
  return parts.length ? parts.join('\n') : null;
}

/** FAQ as [accordion: …] blocks, the format FrequentlyAskedQuestionsSection already parses. */
export function faqToAccordions(faq: Faq | null): string | null {
  if (!faq?.items?.length) return null;
  return faq.items
    .map((it) => {
      const q = esc(it.q).replace(/\]/g, ')');
      const a = it.a
        .split(/\n\s*\n/)
        .map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`)
        .join('');
      return `[accordion: ${q}]${a}[/accordion]`;
    })
    .join('\n');
}
