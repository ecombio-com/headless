// Sends the sign-in code (P1.4.5). Live: Brevo transactional API (free plan: 300 emails/day, all brand domains).
// Local dev without BREVO_API_KEY: the code is printed to the dev-server terminal only.
import 'server-only';

export async function sendSignInCode(opts: {
  apiKey: string | undefined;
  to: string;
  code: string;
  brandName: string;
  fromDomain?: string;
}) {
  const {apiKey, to, code, brandName, fromDomain} = opts;
  const subject = `${code} is your ${brandName} sign-in code`;
  const text = `Your ${brandName} sign-in code is ${code}.\n\nIt expires in 10 minutes. If you didn't ask for it, you can ignore this email.`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
<p style="font-size:16px;margin:0 0 16px">Your ${brandName} sign-in code:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:0 0 16px">${code}</p>
<p style="font-size:14px;color:#555;margin:0">It expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>
</div>`;

  if (!apiKey || !fromDomain) {
    if (process.env.NODE_ENV === 'production') throw new Error('BREVO_API_KEY is not set');
    console.info(`[auth] dev sign-in code for ${to}: ${code}`);
    return;
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json'},
    body: JSON.stringify({
      sender: {name: brandName, email: `no-reply@${fromDomain}`},
      to: [{email: to}],
      subject,
      htmlContent: html,
      textContent: text,
      tags: ['sign-in-code'],
    }),
  });
  if (!res.ok) throw new Error(`Brevo send failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
}
