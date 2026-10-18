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
  it("sends visitors without an account to the setup wizard, then asks known accounts to sign in", async () => {
    const { accessDecision } = await import("./auth");
    const none = newTenant();
    const admin = await createAdmin("a@b.ma", "motdepasse1");
    const started = { ...newTenant(), admin };
    const finished = {
      ...started,
      onboarding: { ...started.onboarding, finishedAt: "2026-10-18T10:00:00Z" },
    };
    // No account: every app page goes to the wizard, the wizard itself is open.
    expect(accessDecision("/devis/nouveau", null, false)).toBe("setup");
    expect(accessDecision("/dashboard", none, false)).toBe("setup");
    expect(accessDecision("/onboarding", null, false)).toBe("open");
    // Account created but setup not finished: back to the wizard.
    expect(accessDecision("/devis/nouveau", started, true)).toBe("setup");
    // Known account, not signed in: sign-in first (wizard included).
    expect(accessDecision("/devis/nouveau", finished, false)).toBe("login");
    expect(accessDecision("/onboarding", started, false)).toBe("login");
    // Signed in with a finished setup: the app.
    expect(accessDecision("/devis/nouveau", finished, true)).toBe("open");
    expect(accessDecision("/parametres/", finished, true)).toBe("open");
  });
});
