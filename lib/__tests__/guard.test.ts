import { describe, it, expect } from "vitest";
import { extractAlert } from "@/lib/guard";

describe("extractAlert (drift-verdict parser)", () => {
  it("treats an explicit null alert as authoritative silence", () => {
    expect(extractAlert('{"alert": null}')).toEqual({ found: true, alert: null });
  });

  it("returns found:false for unparseable garbage (so callers can fall back)", () => {
    expect(extractAlert("the model said no")).toEqual({ found: false, alert: null });
    expect(extractAlert("")).toEqual({ found: false, alert: null });
  });

  it("parses a well-formed drift alert", () => {
    const raw = JSON.stringify({
      alert: { kind: "drift", headline: "Billing reverses the Postgres standard", why: "reconcile with Q1", owner: "priya", prior: { quote: "we standardized on Postgres", who: "priya", when: "Q1" } },
    });
    const r = extractAlert(raw);
    expect(r.found).toBe(true);
    expect(r.alert?.kind).toBe("drift");
    expect(r.alert?.prior.quote).toContain("Postgres");
  });

  it("rejects an alert with no cited prior quote as untrustworthy", () => {
    const raw = JSON.stringify({ alert: { kind: "drift", headline: "something", prior: {} } });
    expect(extractAlert(raw)).toEqual({ found: true, alert: null });
  });

  it("rejects an invalid kind", () => {
    const raw = JSON.stringify({ alert: { kind: "banana", headline: "x", prior: { quote: "y" } } });
    expect(extractAlert(raw).alert).toBeNull();
  });

  it("extracts JSON embedded in surrounding prose", () => {
    const raw = 'Sure! Here is the verdict:\n{"alert": {"kind":"duplicate","headline":"two retry queues","prior":{"quote":"Platform already shipped a retry queue"}}}\nHope that helps.';
    const r = extractAlert(raw);
    expect(r.found).toBe(true);
    expect(r.alert?.kind).toBe("duplicate");
  });

  it("strips a reasoning <think> block before parsing", () => {
    const raw = '<think>let me consider…</think>{"alert": null}';
    expect(extractAlert(raw)).toEqual({ found: true, alert: null });
  });
});
