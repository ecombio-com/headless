'use client';
// Canyon-style sign-in: email -> 6-digit code, or Continue with Google (P1.4).
import {useState, type FormEvent} from 'react';
import {Button} from '~/components/ui/button';
import {Input} from '~/components/ui/input';
import {Label} from '~/components/ui/label';
import {authClient} from '~/lib/auth-client';

type Step = 'email' | 'code';

export function SignInForm({brandName, redirectTo, googleEnabled}: {brandName: string; redirectTo: string; googleEnabled: boolean}) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    const {error} = await authClient.emailOtp.sendVerificationOtp({email: email.trim(), type: 'sign-in'});
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? 'Too many codes requested. Try again in a few minutes.' : "We couldn't send your code. Try again in a minute.");
      return;
    }
    setNotice(`We sent a 6-digit code to ${email.trim()}.`);
    setStep('code');
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const {error} = await authClient.signIn.emailOtp({email: email.trim(), otp: code.trim()});
    if (error) {
      setBusy(false);
      setError('That code is wrong or expired. Check it, or send a new one.');
      return;
    }
    window.location.assign(redirectTo);
  }

  async function google() {
    setBusy(true);
    setError(null);
    const {error} = await authClient.signIn.social({provider: 'google', callbackURL: redirectTo});
    if (error) {
      setBusy(false);
      setError("Google sign-in didn't work. Try again or use your email.");
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <h1 className="text-ds-h3 font-semibold tracking-tight text-foreground">
        {step === 'email' ? 'Sign in or create an account' : 'Enter your code'}
      </h1>
      <p className="mt-2 text-ds-regular text-muted-foreground">
        {step === 'email' ? `Use your email to sign in to ${brandName}. New here? We'll create your account.` : notice}
      </p>

      {step === 'email' ? (
        <form onSubmit={sendCode} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
          </div>
          <Button type="submit" size="lg" className="h-11 w-full" disabled={busy || !email}>
            {busy ? 'Sending…' : 'Continue'}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">6-digit code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="h-11 tracking-[0.4em]"
            />
          </div>
          <Button type="submit" size="lg" className="h-11 w-full" disabled={busy || code.length !== 6}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
          <div className="flex justify-between text-ds-small">
            <button type="button" className="text-muted-foreground underline-offset-4 hover:underline" onClick={() => { setStep('email'); setCode(''); setError(null); }}>
              Use a different email
            </button>
            <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" disabled={busy} onClick={() => sendCode()}>
              Send a new code
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 text-ds-small text-destructive">
          {error}
        </p>
      )}

      {step === 'email' && googleEnabled && (
        <>
          <div className="my-6 flex items-center gap-3 text-ds-small text-muted-foreground">
            <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" size="lg" className="h-11 w-full" disabled={busy} onClick={google}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            Continue with Google
          </Button>
        </>
      )}

      <p className="mt-8 text-ds-small text-muted-foreground">
        By continuing, you agree to {brandName}&apos;s Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
