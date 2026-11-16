'use client';
// Ported from ($locale).account.profile.tsx by scripts/split-route.mjs.
import type {action} from './server';
import posthog from 'posthog-js';
import {cn} from '~/lib/cn';
import type {CustomerFragment} from 'customer-accountapi.generated';
import {Form, useActionData, useNavigation, useOutletContext} from '~/compat/router';
import type {Route} from '~/server/route-types';
import {AccountCard} from '~/components/account/account-card';
import {AccountPageHeader} from '~/components/account/page-header';
import {buttonVariants} from '~/components/ui/button';


export type ActionResponse = {
  error: string | null;
  customer: CustomerFragment | null;
};

const INPUT =
  'h-10 w-full rounded-ds-md border border-border bg-background px-3 text-ds-regular outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

const LABEL = 'text-ds-small font-medium';

export default function AccountProfile() {
  const account = useOutletContext<{customer: CustomerFragment}>();
  const {state} = useNavigation();
  const action = useActionData<ActionResponse>();
  const customer = action?.customer ?? account?.customer;

  return (
    <>
      <AccountPageHeader title="Profile" description="Manage your personal details." />
      <AccountCard title="Personal information">
        <Form method="PUT" onSubmit={() => posthog.capture('profile_update_submitted')} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={LABEL} htmlFor="firstName">
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                placeholder="First name"
                defaultValue={customer.firstName ?? ''}
                minLength={2}
                className={INPUT}
              />
            </div>
            <div className="grid gap-1.5">
              <label className={LABEL} htmlFor="lastName">
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                placeholder="Last name"
                defaultValue={customer.lastName ?? ''}
                minLength={2}
                className={INPUT}
              />
            </div>
          </div>
          {action?.error ? (
            <p role="alert" className="text-ds-small text-destructive">
              {action.error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={state !== 'idle'}
            className={cn(buttonVariants(), 'h-10 w-fit px-6 disabled:opacity-50')}
          >
            {state !== 'idle' ? 'Updating' : 'Update'}
          </button>
        </Form>
      </AccountCard>
    </>
  );
}
