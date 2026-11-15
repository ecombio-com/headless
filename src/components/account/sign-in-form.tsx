'use client';
import {useState} from 'react';
import {authClient} from '~/lib/auth-client';

// googleEnabled is accepted and ignored so the existing page.tsx call site keeps compiling.
export function SignInForm({brandName, redirectTo}: {brandName: string; redirectTo: string; googleEnabled?: boolean}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const {error} = await authClient.signIn.email({email: email.trim(), password});
    if (error) {
      setError(error.message ?? 'Sign-in failed');
      setBusy(false);
      return;
    }
    window.location.assign(redirectTo);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Sign in to {brandName}</h1>
      <input type="email" required autoComplete="email" placeholder="Email" value={email}
        onChange={(e) => setEmail(e.target.value)} className="rounded border px-3 py-2" />
      <input type="password" required autoComplete="current-password" placeholder="Password" value={password}
        onChange={(e) => setPassword(e.target.value)} className="rounded border px-3 py-2" />
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={busy} className="rounded bg-black px-3 py-2 text-white disabled:opacity-60">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
