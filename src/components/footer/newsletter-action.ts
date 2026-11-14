'use server';
// Newsletter sign-up as a Server Action (the form posts straight here, no API route needed).
import {action} from '~/routes/api.newsletter/server';
import {getRequestContext} from '~/server/site';

export type NewsletterState = {status: 'idle' | 'success' | 'error'; message?: string};

export async function subscribeToNewsletter(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const context = await getRequestContext();
  const request = new Request(context.request.url, {method: 'POST', body: formData});
  return (await action({request, params: {}, context})) as NewsletterState;
}
