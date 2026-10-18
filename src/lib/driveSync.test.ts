import { describe, expect, it } from "vitest";
import { driveFileName, fingerprint, needsUpload, periodOf, type DriveRecord } from "./driveSync";

const rec = (over: Partial<DriveRecord> = {}): DriveRecord => ({
  fileId: "file1",
  link: "https://drive.google.com/file/d/file1/view",
  folderId: "root",
  hash: "h1",
  uploadedAt: "2026-10-18T10:00:00Z",
  error: null,
  attempts: 0,
  ...over,
});

describe("drive sync helpers", () => {
  it("builds readable file names", () => {
    expect(driveFileName("DV-2026-001", " Hôtel Tanger Bay ", 86400)).toBe(
      "DV-2026-001 – Hôtel Tanger Bay – 86 400 DH",
    );
    expect(driveFileName("DV-2026-002", "", 1234.5)).toBe("DV-2026-002 – 1 234,5 DH");
  });

  it("fingerprints content, ignoring key order and follow-up reminders", () => {
    const a = fingerprint({ number: "DV-1", lines: [{ qty: 1 }], reminders: [] });
    expect(fingerprint({ lines: [{ qty: 1 }], number: "DV-1", reminders: [{ date: "x" }] })).toBe(
      a,
    );
    expect(fingerprint({ number: "DV-1", lines: [{ qty: 2 }] })).not.toBe(a);
  });

  it("uploads only when something changed", () => {
    expect(needsUpload(null, "h1", "root")).toBe(true);
    expect(needsUpload(rec(), "h1", "root")).toBe(false); // page refresh: no duplicate
    expect(needsUpload(rec(), "h2", "root")).toBe(true); // edited after upload
    expect(needsUpload(rec(), "h1", "other")).toBe(true); // another folder chosen
    expect(needsUpload(rec({ error: "network" }), "h1", "root")).toBe(true); // retry
  });

  it("files by issue month", () => {
    expect(periodOf("2026-10-18")).toEqual({ year: 2026, month: 10 });
    expect(periodOf("")).toMatchObject({ year: new Date().getFullYear() });
  });
});
