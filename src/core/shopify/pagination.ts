// Cursor pagination from ?cursor=&direction= (Hydrogen's <Pagination> convention).
export function getPaginationVariables(request: Request, {pageBy = 20}: {pageBy?: number} = {}) {
  const sp = new URL(request.url).searchParams;
  const cursor = sp.get('cursor') ?? undefined;
  const isPrevious = sp.get('direction') === 'previous';
  return isPrevious
    ? {last: pageBy, startCursor: cursor ?? null}
    : {first: pageBy, endCursor: cursor ?? null};
}
