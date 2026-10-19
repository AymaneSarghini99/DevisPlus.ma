import { beforeEach, describe, expect, it } from "vitest";
import { createAdmin, hasLock, verifyAdmin } from "./auth";
import { linkTenant } from "./account/link";
import { hashPassword, verifyPassword } from "./account/password";
import { newTenant } from "./tenant";

beforeEach(() => sessionStorage.clear());

describe("admin lock", () => {
  it("stores a salted hash, never the password", async () => {
    const a = await createAdmin(" Admin@Atlas.ma ", "motdepasse1");
    expect(a.email).toBe("admin@atlas.ma");
    expect(a.passwordHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(a)).not.toContain("motdepasse1");
    const b = await createAdmin("admin@atlas.ma", "motdepasse1");
    expect(b.salt).not.toBe(a.salt);
    expect(b.passwordHash).not.toBe(a.passwordHash);
  });

  it("accepts only the right email and password", async () => {
    const a = await createAdmin("admin@atlas.ma", "motdepasse1");
    expect(await verifyAdmin(a, "ADMIN@atlas.ma", "motdepasse1")).toBe(true);
    expect(await verifyAdmin(a, "admin@atlas.ma", "motdepasse2")).toBe(false);
    expect(await verifyAdmin(a, "other@atlas.ma", "motdepasse1")).toBe(false);
  });

  it("counts a browser workspace as having an account once linked or locked", async () => {
    expect(hasLock(newTenant())).toBe(false);
    expect(hasLock({ ...newTenant(), admin: await createAdmin("a@b.ma", "motdepasse1") })).toBe(
      true,
    );
    expect(hasLock({ ...newTenant(), admin: { ...newTenant().admin, userId: "u1" } })).toBe(true);
  });
});

describe("server account passwords", () => {
  it("are stored as a salted PBKDF2 hash and verified", async () => {
    const h = await hashPassword("motdepasse1");
    // At most 100 000 iterations: the limit of Cloudflare Workers.
    expect(h).toMatch(/^pbkdf2\$100000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(h).not.toContain("motdepasse1");
    expect(await hashPassword("motdepasse1")).not.toBe(h);
    expect(await verifyPassword({ hash: h, password: "motdepasse1" })).toBe(true);
    expect(await verifyPassword({ hash: h, password: "motdepasse2" })).toBe(false);
    expect(await verifyPassword({ hash: "garbage", password: "motdepasse1" })).toBe(false);
  });
});

describe("linking this browser's workspace to the signed-in account", () => {
  const user = { id: "user-1", email: "Admin@Atlas.ma" };

  it("creates a workspace for a new device", () => {
    const r = linkTenant(null, user, "fr");
    expect("tenant" in r && r.tenant.admin.userId).toBe("user-1");
    expect("tenant" in r && r.tenant.admin.email).toBe("admin@atlas.ma");
    expect("tenant" in r && r.tenant.onboarding.finishedAt).toBeNull();
  });

  it("keeps the account's own workspace and refuses another account's", () => {
    const mine = { ...newTenant(), admin: { ...newTenant().admin, userId: "user-1" } };
    expect(linkTenant(mine, user, "fr")).toEqual({ tenant: mine, changed: false });
    expect(linkTenant(mine, { id: "user-2", email: "x@y.ma" }, "fr")).toEqual({ other: true });
  });

  it("links an older browser-only workspace with the same email, never another email's", async () => {
    const legacy = { ...newTenant(), admin: await createAdmin("admin@atlas.ma", "motdepasse1") };
    const r = linkTenant(legacy, user, "fr");
    expect("tenant" in r && r.tenant.admin).toEqual({
      email: "admin@atlas.ma",
      passwordHash: "",
      salt: "",
      googleSub: "",
      userId: "user-1",
    });
    expect(linkTenant(legacy, { id: "user-2", email: "other@atlas.ma" }, "fr")).toEqual({
      other: true,
    });
    // A wizard started before any account (no lock) simply becomes this account's.
    expect("tenant" in linkTenant(newTenant(), user, "fr")).toBe(true);
  });
});

describe("access to the app pages", () => {
  it("sends visitors to sign up or sign in, then the setup wizard", async () => {
    const { accessDecision, safeNext } = await import("./auth");
    const started = { ...newTenant(), admin: { ...newTenant().admin, userId: "user-1" } };
    const finished = {
      ...started,
      onboarding: { ...started.onboarding, finishedAt: "2026-10-19T10:00:00Z" },
    };
    // Not signed in, no account's workspace in this browser: sign-up.
    expect(accessDecision("/devis/nouveau", null, false)).toBe("signup");
    expect(accessDecision("/onboarding", newTenant(), false)).toBe("signup");
    // Not signed in, this browser has an account's workspace: sign-in.
    expect(accessDecision("/devis/nouveau", finished, false)).toBe("login");
    expect(accessDecision("/onboarding", started, false)).toBe("login");
    // Signed in, setup unfinished: the wizard (which itself is open).
    expect(accessDecision("/dashboard", started, true)).toBe("setup");
    expect(accessDecision("/onboarding", started, true)).toBe("open");
    // Signed in and set up.
    expect(accessDecision("/devis/nouveau", finished, true)).toBe("open");
    // Return paths stay inside the app.
    expect(safeNext("/devis/nouveau")).toBe("/devis/nouveau");
    expect(safeNext("//evil.example")).toBeUndefined();
    expect(safeNext("https://evil.example")).toBeUndefined();
  });
});
