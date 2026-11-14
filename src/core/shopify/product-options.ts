// Product options from the URL (?Color=Red&Size=M), like Hydrogen's helper.
export function getSelectedProductOptions(request: Request) {
  const sp = new URL(request.url).searchParams;
  const skip = new Set(['cursor', 'direction', 'q', 'sort', 'page', 'utm_source', 'utm_medium', 'utm_campaign', '_pos', '_sid', '_ss', 'variant']);
  return [...sp.entries()].filter(([k]) => !skip.has(k) && !k.startsWith('filter.')).map(([name, value]) => ({name, value}));
}
