import { describe, expect, it, vi } from "vitest";
import { emailConfig, resetEmail, sendEmail } from "./email";

describe("password reset email", () => {
  it("is only sent when an email service is configured", () => {
    expect(emailConfig({})).toBeNull();
    expect(emailConfig({ RESEND_API_KEY: "k" })).toBeNull();
    expect(emailConfig({ RESEND_API_KEY: "k", EMAIL_FROM: "DevisPlus <a@b.ma>" })).toEqual({
      apiKey: "k",
      from: "DevisPlus <a@b.ma>",
    });
  });

  it("carries the reset link, escaped in the HTML version", async () => {
    const url = 'https://devisplus.ma/api/auth/reset-password/t0k?callbackURL=/reinitialiser&x="1"';
    const m = resetEmail(url);
    expect(m.text).toContain(url);
    expect(m.html).not.toContain('x="1"');
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    await sendEmail({ apiKey: "k", from: "a@b.ma" }, { to: "c@d.ma", ...m }, f as never);
    const [endpoint, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe("https://api.resend.com/emails");
    expect(JSON.parse(String(init.body))).toMatchObject({ from: "a@b.ma", to: "c@d.ma" });
    const bad = vi.fn(async () => new Response("{}", { status: 422 }));
    await expect(
      sendEmail({ apiKey: "k", from: "a" }, { to: "c", ...m }, bad as never),
    ).rejects.toThrow();
  });
});
