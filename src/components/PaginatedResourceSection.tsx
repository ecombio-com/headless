// A list of Storefront API nodes with "Load previous" / "Load more" cursor links.
// Works in Server Components: only the links are client code.
import type {ReactNode} from 'react';
import {PaginationLink} from '~/components/ui/pagination';

type Connection<N> = {
  nodes: N[];
  pageInfo: {hasNextPage: boolean; hasPreviousPage: boolean; startCursor?: string | null; endCursor?: string | null};
};

export function PaginatedResourceSection<N>({
  connection,
  children,
  ariaLabel,
  resourcesClassName,
}: {
  connection: Connection<N>;
  children: (args: {node: N; index: number}) => ReactNode;
  ariaLabel?: string;
  resourcesClassName?: string;
}) {
  const {pageInfo} = connection;
  const items = connection.nodes.map((node, index) => children({node, index}));
  return (
    <div>
      {pageInfo.hasPreviousPage ? (
        <PaginationLink cursor={pageInfo.startCursor} direction="previous">
          <span aria-hidden="true">↑</span> Load previous
        </PaginationLink>
      ) : null}
      {resourcesClassName ? (
        <div aria-label={ariaLabel} className={resourcesClassName} role={ariaLabel ? 'region' : undefined}>
          {items}
        </div>
      ) : (
        items
      )}
      {pageInfo.hasNextPage ? (
        <PaginationLink cursor={pageInfo.endCursor} direction="next">
          Load more <span aria-hidden="true">↓</span>
        </PaginationLink>
      ) : null}
    </div>
  );
}
