import { describe, expect, it } from "vitest";
import { matchCountryImageNames } from "./country-card-images";

describe("matchCountryImageNames", () => {
  it("orders numbered images before the unnumbered image", () => {
    expect(matchCountryImageNames("Canada", ["Canada.jpeg", "canada_10.png", "Canada-2.webp", "Canada_1.jpg"]))
      .toEqual([
        { fileName: "Canada_1.jpg", serial: 1 },
        { fileName: "Canada-2.webp", serial: 2 },
        { fileName: "canada_10.png", serial: 10 },
        { fileName: "Canada.jpeg", serial: null },
      ]);
  });

  it("supports short aliases and adjacent serial numbers", () => {
    expect(matchCountryImageNames("United Kingdom", ["UK2.jpeg", "uk_1.jpeg", "USA1.jpeg"]))
      .toEqual([
        { fileName: "uk_1.jpeg", serial: 1 },
        { fileName: "UK2.jpeg", serial: 2 },
      ]);
  });

  it("does not accept extra words or another country's alias", () => {
    expect(matchCountryImageNames("New Zealand", ["new-zealand-attached.jpeg", "NZ-campus.jpg", "USA1.jpeg", "NZ1.jpeg"]))
      .toEqual([{ fileName: "NZ1.jpeg", serial: 1 }]);
  });
});
