'use client';
// Ported from ($locale).account.tsx by scripts/split-route.mjs.
import type {loader} from './server';
import {Outlet, useLoaderData} from '~/compat/router';
import type {Route} from '~/server/route-types';
import {AccountTabs} from '~/components/account/account-tabs';
import {SignOutButton} from '~/components/account/sign-out-button';
import {Container} from '~/components/ui/container';
import {Page} from '~/components/ui/page';


export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();

  return (
    <Page className="flex flex-1 flex-col bg-muted">
      <Container className="flex flex-1 flex-col gap-6 pb-12">
        <div className="ml-auto w-28 pt-4">
          <SignOutButton />
        </div>
        <AccountTabs />
        <div className="mx-auto grid w-full max-w-5xl gap-5">
          <Outlet context={{customer}} />
        </div>
      </Container>
    </Page>
  );
}
