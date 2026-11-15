// Sends the 6-digit sign-in code through Brevo (specs/001-customer-sign-in). Never logs the code outside local dev.
import 'server-only';
import {apexOf, getAuthHosts} from './hosts';

const NAMES: Record<string, string> = {bicyclebio: 'BicycleBio', scooterbio: 'ScooterBio', skaterbio: 'SkaterBio'};

export async function sendSignInCode({email, otp, requestUrl, apiKey}: {email: string; otp: string; requestUrl: string; apiKey?: string}) {
  const hostname = new URL(requestUrl).hostname;
  const local = getAuthHosts(requestUrl).cookieDomain === undefined;
  if (local) {
    console.log(`[auth dev] sign-in code for ${email}: ${otp}`);
    return;
  }
  if (!apiKey) {
    console.error('[auth] BREVO_API_KEY is not set; sign-in code was not sent');
    return;
  }
  const apex = apexOf(hostname);
  const brand = NAMES[apex.split('.')[0]] ?? apex;
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json'},
    body: JSON.stringify({
      sender: {name: brand, email: `no-reply@${apex}`},
      to: [{email}],
      subject: `Your ${brand} sign-in code`,
      htmlContent:
        `<div style="font-family:Arial,sans-serif;max-width:420px">` +
        `<p>Your ${brand} sign-in code is:</p>` +
        `<p style="font-size:32px;font-weight:700;letter-spacing:6px">${otp}</p>` +
        `<p>It expires in 10 minutes. If you did not ask for it, you can ignore this email.</p></div>`,
    }),
  });
  if (!res.ok) console.error(`[auth] Brevo send failed: HTTP ${res.status}`);
}