import { describe, expect, it } from "vitest";
import { catalogHref } from "./catalog-url";

describe("catalogHref", () => {
  it("returns the bare catalog path with no filters", () => {
    expect(catalogHref({})).toBe("/products");
  });

  it("keeps current filters when the patch does not mention them", () => {
    expect(catalogHref({ q: "monitor", category: "monitors" }, { sort: "price-asc" })).toBe(
      "/products?q=monitor&category=monitors&sort=price-asc"
    );
  });

  it("overrides a current filter", () => {
    expect(catalogHref({ sort: "name" }, { sort: "newest" })).toBe(
      "/products?sort=newest"
    );
  });

  it("clears a filter when the patch passes undefined", () => {
    expect(catalogHref({ q: "monitor", sort: "name" }, { q: undefined })).toBe(
      "/products?sort=name"
    );
  });

  it("drops empty strings so a cleared input does not leave ?q=", () => {
    expect(catalogHref({ q: "" })).toBe("/products");
    expect(catalogHref({ q: "monitor" }, { q: "" })).toBe("/products");
  });

  it("emits keys in a stable order regardless of input order", () => {
    const a = catalogHref({ sort: "name", q: "eq", category: "eq" });
    const b = catalogHref({ category: "eq", q: "eq", sort: "name" });
    expect(a).toBe(b);
    expect(a).toBe("/products?q=eq&category=eq&sort=name");
  });

  it("percent-encodes user input", () => {
    expect(catalogHref({ q: "near field & sub" })).toBe(
      "/products?q=near+field+%26+sub"
    );
  });

  it("ignores keys that are not catalog filters", () => {
    expect(
      catalogHref({ q: "eq" }, { evil: "1" } as unknown as Record<string, string>)
    ).toBe("/products?q=eq");
  });

  it("round-trips through URLSearchParams", () => {
    const href = catalogHref({ q: "monitor", min: "100", max: "500" });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("q")).toBe("monitor");
    expect(params.get("min")).toBe("100");
    expect(params.get("max")).toBe("500");
  });
});
