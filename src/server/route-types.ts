// Stand-in for react-router's generated `./+types/<route>` (Route.LoaderArgs, Route.MetaFunction, ...).
import type {AppContext} from './context';

export namespace Route {
  export type LoaderArgs = {request: Request; params: Record<string, string | undefined>; context: AppContext};
  export type ActionArgs = LoaderArgs;
  export type MetaArgs = {
    data: any;
    params: Record<string, string | undefined>;
    location: {pathname: string; search: string};
    matches: ReadonlyArray<{id: string; data: unknown}>;
  };
  export type MetaFunction = (args: MetaArgs) => any[];
  export type HeadersFunction = (args: {actionHeaders: Headers; loaderHeaders: Headers}) => HeadersInit;
  export type ComponentProps = {loaderData: any; params: Record<string, string | undefined>};
}
