import {cn} from '~/lib/cn';
import {Form} from '~/compat/router';
import {buttonVariants} from '~/components/ui/button';

export function SignOutButton() {
  return (
    <Form method="POST" action="/account/logout">
      <button
        type="submit"
        className={cn(buttonVariants({size: 'sm', variant: 'outline'}), 'w-full justify-center')}
      >
        Sign out
      </button>
    </Form>
  );
}