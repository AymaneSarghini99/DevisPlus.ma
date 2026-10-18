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
