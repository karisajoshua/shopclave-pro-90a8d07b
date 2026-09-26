import { describe, it, expect } from "vitest";
import { COUNTRIES, DEFAULT_COUNTRY, countryByCode, countryByName, searchCountries, validatePostal, addressFormat, isDomesticDestination } from "@/lib/countries";

describe("countries", () => {
  it("defaults to Canada with +1", () => {
    expect(DEFAULT_COUNTRY).toBe("CA");
    expect(countryByCode("CA")).toMatchObject({ name: "Canada", dial: "+1" });
  });
  it("has a worldwide list with unique codes", () => {
    expect(COUNTRIES.length).toBeGreaterThan(230);
    expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(COUNTRIES.length);
  });
  it("searches Kenya, US and UK", () => {
    expect(searchCountries("keny").map((c) => c.code)).toEqual(["KE"]);
    expect(countryByCode("KE")!.dial).toBe("+254");
    expect(searchCountries("united states").map((c) => c.code)).toContain("US");
    expect(searchCountries("uk").map((c) => c.code)).toContain("GB");
    expect(countryByName("United Kingdom")?.code).toBe("GB");
  });
  it("keeps +1 countries distinct", () => {
    const plusOne = searchCountries("+1").map((c) => c.code);
    expect(plusOne).toEqual(expect.arrayContaining(["CA", "US", "JM"]));
  });
  it("validates postal codes per country", () => {
    expect(validatePostal("CA", "K1A 0B1")).toBeNull();
    expect(validatePostal("CA", "12345")).toMatch(/Postal Code/);
    expect(validatePostal("CA", "")).toMatch(/required/);
    expect(validatePostal("US", "10001")).toBeNull();
    expect(validatePostal("US", "ABC")).toMatch(/ZIP/);
    expect(validatePostal("GB", "SW1A 1AA")).toBeNull();
    expect(validatePostal("KE", "")).toBeNull();
    expect(addressFormat("CA").regionLabel).toBe("Province / Territory");
  });
  it("only Canada is a domestic (payable) destination", () => {
    expect(isDomesticDestination("CA")).toBe(true);
    for (const c of ["US", "KE", "GB"]) expect(isDomesticDestination(c)).toBe(false);
  });
});
