import { describe, expect, it } from "vitest";
import { adminRedirect, canonicalRedirect, deploymentFrom } from "./deployment";
import { cleanHostname, stateOf } from "./domains/cloudflare";

describe("deployment settings", () => {
  it("defaults to the shared app with approval and the DevisPlus admin email", () => {
    const d = deploymentFrom({ APP_URL: "https://devisplus.ma" });
    expect(d.signupMode).toBe("approval");
    expect(d.adminEmails).toEqual(["contact@devisplus.ma"]);
    expect(d.origins).toEqual(["https://devisplus.ma"]);
  });

  it("reads the sign-up mode, the admin host and extra origins", () => {
    const d = deploymentFrom({
      APP_URL: "https://atlas.devisplus.ma/",
      SIGNUP_MODE: "Closed",
      ADMIN_HOST: "admin.devisplus.ma",
      APP_ORIGINS: "https://devis.atlas.ma, nonsense:// ",
      PLATFORM_ADMIN_EMAILS: "Me@Devisplus.ma,team@devisplus.ma",
    });
    expect(d.signupMode).toBe("closed");
    expect(d.origins).toEqual([
      "https://atlas.devisplus.ma",
      "https://admin.devisplus.ma",
      "https://devis.atlas.ma",
    ]);
    expect(d.adminEmails).toEqual(["me@devisplus.ma", "team@devisplus.ma"]);
    expect(deploymentFrom({ SIGNUP_MODE: "everyone" }).signupMode).toBe("approval");
  });
});

describe("admin portal host", () => {
  const d = { adminHost: "admin.devisplus.ma" };
  const go = (u: string) => adminRedirect(new URL(u), d);

  it("serves only /admin and the sign-in page on the admin host", () => {
    expect(go("https://admin.devisplus.ma/")).toBe("https://admin.devisplus.ma/admin");
    expect(go("https://admin.devisplus.ma/dashboard")).toBe("https://admin.devisplus.ma/admin");
    expect(go("https://admin.devisplus.ma/admin")).toBeNull();
    expect(go("https://admin.devisplus.ma/connexion?next=/admin")).toBeNull();
    expect(go("https://admin.devisplus.ma/api/admin/accounts")).toBeNull();
    expect(go("https://admin.devisplus.ma/assets/app.js")).toBeNull();
  });

  it("moves /admin from the other hosts to the admin host", () => {
    expect(go("https://devisplus.ma/admin")).toBe("https://admin.devisplus.ma/admin");
    expect(go("https://devisplus.ma/dashboard")).toBeNull();
    expect(adminRedirect(new URL("https://devisplus.ma/admin"), { adminHost: "" })).toBeNull();
  });
});

describe("customer domains (Cloudflare custom hostnames)", () => {
  it("accepts plain domain names only", () => {
    expect(cleanHostname(" https://Devis.Atlas.ma/ ")).toBe("devis.atlas.ma");
    expect(cleanHostname("localhost")).toBeNull();
    expect(cleanHostname("atlas ma")).toBeNull();
    expect(cleanHostname(42)).toBeNull();
  });

  it("lists the DNS records the customer must add, and is active once verified", () => {
    const pending = stateOf(
      {
        id: "h1",
        hostname: "devis.atlas.ma",
        status: "pending",
        ssl: { status: "pending_validation" },
        ownership_verification: {
          type: "txt",
          name: "_cf-custom-hostname.devis.atlas.ma",
          value: "abc",
        },
      },
      "customers.devisplus.ma",
    );
    expect(pending.state).toBe("pending");
    expect(pending.records).toEqual([
      { type: "CNAME", name: "devis.atlas.ma", value: "customers.devisplus.ma" },
      { type: "TXT", name: "_cf-custom-hostname.devis.atlas.ma", value: "abc" },
    ]);
    const active = stateOf(
      { id: "h1", hostname: "devis.atlas.ma", status: "active", ssl: { status: "active" } },
      "customers.devisplus.ma",
    );
    expect(active.state).toBe("active");
    expect(active.records).toHaveLength(1);
  });
});

describe("main-address routing", () => {
  const app = "https://www.devisplus.ma";
  const go = (u: string, method = "GET") => canonicalRedirect(new URL(u), method, app);

  it("moves page visits on the bare domain to www, keeping path and query", () => {
    expect(go("https://devisplus.ma/")).toBe("https://www.devisplus.ma/");
    expect(go("https://devisplus.ma/tarifs?x=1")).toBe("https://www.devisplus.ma/tarifs?x=1");
  });

  it("leaves www, other hosts, server routes, files and posts alone", () => {
    expect(go("https://www.devisplus.ma/tarifs")).toBeNull();
    expect(go("https://atlas.devisplus.ma/")).toBeNull();
    expect(go("https://devisplus.ma/api/auth/session")).toBeNull();
    expect(go("https://devisplus.ma/og-image.png")).toBeNull();
    expect(go("https://devisplus.ma/connexion", "POST")).toBeNull();
    expect(
      canonicalRedirect(new URL("https://devisplus.ma/"), "GET", "https://devisplus.ma"),
    ).toBeNull();
    expect(canonicalRedirect(new URL("https://devisplus.ma/"), "GET", "")).toBeNull();
  });
});
