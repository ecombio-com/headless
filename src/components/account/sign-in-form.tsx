'use client';
import {useState} from 'react';
import {authClient} from '~/lib/auth-client';

export function SignInForm({brandName, redirectTo, googleEnabled}: {brandName: string; redirectTo: string; googleEnabled?: boolean}) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await authClient.emailOtp.sendVerificationOtp({email: email.trim(), type: 'sign-in'});
    setBusy(false);
    if (res.error) {
      setMessage(res.error.message ?? 'We could not send a code. Please try again in a moment.');
      return;
    }
    setStep('code');
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await authClient.signIn.emailOtp({email: email.trim(), otp: code.trim()});
    if (res.error) {
      setMessage(res.error.message ?? 'That code did not work. Check it and try again.');
      setBusy(false);
      return;
    }
    window.location.assign(redirectTo);
  }

  async function google() {
    setBusy(true);
    setMessage(null);
    const res = await authClient.signIn.social({provider: 'google', callbackURL: redirectTo});
    if (res?.error) {
      setMessage(res.error.message ?? 'Google sign-in failed.');
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-xl font-semibold">Sign in to {brandName}</h1>
      {step === 'email' ? (
        <form onSubmit={sendCode} className="flex flex-col gap-3">
          <input type="email" required autoComplete="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} className="rounded border px-3 py-2" />
          <button type="submit" disabled={busy} className="rounded bg-black px-3 py-2 text-white disabled:opacity-60">
            {busy ? 'Sending…' : 'Email me a code'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-3">
          <p className="text-sm">We sent a 6-digit code to {email}. It expires in 10 minutes.</p>
          <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code" placeholder="6-digit code"
            value={code} onChange={(e) => setCode(e.target.value)} className="rounded border px-3 py-2 tracking-widest" />
          <button type="submit" disabled={busy} className="rounded bg-black px-3 py-2 text-white disabled:opacity-60">
            {busy ? 'Checking…' : 'Sign in'}
          </button>
          <button type="button" onClick={() => { setStep('email'); setCode(''); setMessage(null); }} className="text-sm underline">
            Use a different email
          </button>
        </form>
      )}
      {googleEnabled ? (
        <button type="button" onClick={google} disabled={busy} className="rounded border px-3 py-2 disabled:opacity-60">
          Continue with Google
        </button>
      ) : null}
      {message ? <p role="alert" className="text-sm text-red-600">{message}</p> : null}
    </div>
  );
}