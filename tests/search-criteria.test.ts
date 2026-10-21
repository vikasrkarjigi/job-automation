import { describe, expect, it } from "vitest";
import { checkLocation, checkSalary, checkTitle, salaryBand } from "../src/scout.ts";

describe("search criteria filters", () => {
  it("accepts custom title list", () => {
    expect(checkTitle("Junior AI Engineer", ["AI Engineer"])).toBeNull();
    expect(checkTitle("Backend Developer", ["AI Engineer"])).toMatch(/search list/);
  });

  it("filters by location when set", () => {
    expect(checkLocation("San Francisco, CA", { city: "San Francisco", state: "", country: "" })).toBeNull();
    expect(checkLocation("Austin, TX", { city: "San Francisco", state: "", country: "" })).toMatch(/city/);
  });

  it("parses salary bands", () => {
    expect(salaryBand("Pay is $120k - $150k per year").min).toBe(120_000);
    expect(checkSalary("We offer $90,000 - $110,000", 100_000, null)).toBeNull();
    expect(checkSalary("We offer $90,000 - $110,000", 120_000, null)).toMatch(/below your minimum/);
  });
});
