import { describe, expect, it } from "vitest";
import { centsToDollarInput, formatCents, parseDollarsToCents, slugify } from "./format";

describe("parseDollarsToCents", () => {
  it("accepts plain amounts", () => {
    expect(parseDollarsToCents("19.99")).toBe(1999);
    expect(parseDollarsToCents("0")).toBe(0);
    expect(parseDollarsToCents("0.05")).toBe(5);
    expect(parseDollarsToCents("1000")).toBe(100_000);
  });

  it("rounds rather than truncating the float", () => {
    // 19.99 * 100 is 1998.9999... in IEEE754 — truncation would store 1998.
    expect(parseDollarsToCents("19.99")).toBe(1999);
    expect(parseDollarsToCents("8.29")).toBe(829);
    expect(parseDollarsToCents("1.01")).toBe(101);
  });

  it("tolerates the currency decoration people actually type", () => {
    expect(parseDollarsToCents(" $1,299.00 ")).toBe(129_900);
    expect(parseDollarsToCents("$45")).toBe(4500);
  });

  it("rejects anything that is not a plain amount", () => {
    for (const bad of ["", "abc", "-5", "1.999", "1.2.3", "1e3", "NaN", "12."]) {
      expect(parseDollarsToCents(bad)).toBeNull();
    }
  });

  it("round-trips through centsToDollarInput", () => {
    for (const cents of [0, 5, 99, 1999, 129_900]) {
      expect(parseDollarsToCents(centsToDollarInput(cents))).toBe(cents);
    }
  });
});

describe("formatCents", () => {
  it("renders USD", () => {
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(1999)).toBe("$19.99");
    expect(formatCents(129_900)).toBe("$1,299.00");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Datum 3 Compact Monitor")).toBe("datum-3-compact-monitor");
  });

  it("collapses punctuation and trims stray hyphens", () => {
    expect(slugify("  --Studio / Monitors!!  ")).toBe("studio-monitors");
    expect(slugify("A  &  B")).toBe("a-b");
  });

  it("is idempotent", () => {
    const once = slugify("Reference EQ — 500 Series");
    expect(slugify(once)).toBe(once);
  });

  it("returns an empty string when nothing survives", () => {
    // Worth knowing: the caller must treat this as a validation failure
    // rather than writing an empty slug to a unique column.
    expect(slugify("!!!")).toBe("");
  });
});
