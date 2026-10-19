/**
 * Emails sent by the app's server (password reset). Server only: reads secrets.
 *
 * Uses Resend (https://resend.com) when RESEND_API_KEY and EMAIL_FROM are set, e.g.
 * EMAIL_FROM="DevisPlus <no-reply@devisplus.ma>" (the domain must be verified in Resend).
 * Without them no email is sent: "forgot password" then asks the user to contact the DevisPlus
 * team, who set a new password from the admin portal.
 */
type Env = Record<string, string | undefined>;
export type EmailConfig = { apiKey: string; from: string };

export function emailConfig(env: Env): EmailConfig | null {
  const apiKey = env["RESEND_API_KEY"]?.trim();
  const from = env["EMAIL_FROM"]?.trim();
  return apiKey && from ? { apiKey, from } : null;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Password reset email, in French with Arabic and English lines. */
export function resetEmail(url: string) {
  const subject = "Réinitialiser votre mot de passe DevisPlus";
  const text = [
    "Bonjour,",
    "",
    "Pour choisir un nouveau mot de passe DevisPlus, ouvrez ce lien (valable 1 heure) :",
    url,
    "",
    "لاختيار كلمة مرور جديدة، افتح هذا الرابط (صالح لمدة ساعة).",
    "To choose a new password, open this link (valid for 1 hour).",
    "",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    "— DevisPlus.ma",
  ].join("\n");
  const link = escapeHtml(url);
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#14213D">
<p>Bonjour,</p>
<p>Pour choisir un nouveau mot de passe DevisPlus, cliquez sur le bouton ci-dessous (lien valable 1 heure).</p>
<p><a href="${link}" style="display:inline-block;background:#14213D;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Choisir un nouveau mot de passe</a></p>
<p dir="rtl">لاختيار كلمة مرور جديدة، انقر على الزر أعلاه (الرابط صالح لمدة ساعة).</p>
<p>To choose a new password, click the button above (link valid for 1 hour).</p>
<p style="color:#666;font-size:13px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.<br>${link}</p>
<p>— DevisPlus.ma</p></div>`;
  return { subject, text, html };
}

export async function sendEmail(
  c: EmailConfig,
  msg: { to: string; subject: string; text: string; html: string },
  f: typeof fetch = fetch,
) {
  const res = await f("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${c.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: c.from, ...msg }),
  });
  if (!res.ok) throw new Error(`email not sent (HTTP ${res.status})`);
}
