import { beforeEach, describe, expect, it } from "vitest";
import { createAdmin, hasLock, isUnlocked, lock, unlock, verifyAdmin } from "./auth";
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

  it("unlocks for the browser session only", async () => {
    const t = { ...newTenant(), admin: await createAdmin("admin@atlas.ma", "motdepasse1") };
    expect(hasLock(t)).toBe(true);
    expect(hasLock(newTenant())).toBe(false);
    expect(isUnlocked(t)).toBe(false);
    unlock(t);
    expect(isUnlocked(t)).toBe(true);
    lock();
    expect(isUnlocked(t)).toBe(false);
  });
});

describe("owner access", () => {
  it("is separate from the workspace admin", async () => {
    const { loadOwner, saveOwner, isOwnerSignedIn, signInOwner, signOutOwner } =
      await import("./auth");
    localStorage.clear();
    expect(loadOwner()).toBeNull();
    const a = await createAdmin("owner@devisplus.ma", "proprietaire1");
    saveOwner(a);
    expect(loadOwner()?.email).toBe("owner@devisplus.ma");
    expect(isOwnerSignedIn(a)).toBe(false);
    signInOwner(a);
    expect(isOwnerSignedIn(a)).toBe(true);
    signOutOwner();
    expect(isOwnerSignedIn(a)).toBe(false);
  });
});

describe("access to the app pages", () => {
  it("sends visitors to sign up, sign in, then the setup wizard", async () => {
    const { accessDecision, safeNext, googleMatches } = await import("./auth");
    const admin = await createAdmin("a@b.ma", "motdepasse1");
    const started = { ...newTenant(), admin };
    const finished = {
      ...started,
      onboarding: { ...started.onboarding, finishedAt: "2026-10-19T10:00:00Z" },
    };
    // No account in this browser: sign-up first, for every app page and the wizard.
    expect(accessDecision("/devis/nouveau", null, false)).toBe("signup");
    expect(accessDecision("/onboarding", newTenant(), false)).toBe("signup");
    // Account, not signed in: sign-in.
    expect(accessDecision("/devis/nouveau", finished, false)).toBe("login");
    expect(accessDecision("/onboarding", started, false)).toBe("login");
    // Signed in, setup unfinished: the wizard (which itself is open).
    expect(accessDecision("/dashboard", started, true)).toBe("setup");
    expect(accessDecision("/onboarding", started, true)).toBe("open");
    // Signed in and set up.
    expect(accessDecision("/devis/nouveau", finished, true)).toBe("open");
    // A Google-only account also counts as an account.
    const g = {
      ...newTenant(),
      admin: { ...newTenant().admin, email: "g@b.ma", googleSub: "123" },
    };
    expect(accessDecision("/dashboard", g, false)).toBe("login");
    expect(googleMatches(g, "123")).toBe(true);
    expect(googleMatches(g, "999")).toBe(false);
    expect(googleMatches(newTenant(), "")).toBe(false);
    // Return paths stay inside the app.
    expect(safeNext("/devis/nouveau")).toBe("/devis/nouveau");
    expect(safeNext("//evil.example")).toBeUndefined();
    expect(safeNext("https://evil.example")).toBeUndefined();
  });
});
