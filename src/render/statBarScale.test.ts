import { describe, expect, it } from "vitest";

import { showdownMaxStat, showdownStatBarScale } from "./statBarScale";

describe("Showdown-compatible stat bar scaling", () => {
  it("uses Showdown's level-scaled HP and non-HP maxima", () => {
    expect(showdownMaxStat("hp", 100)).toBe(714);
    expect(showdownMaxStat("atk", 100)).toBe(499);
    expect(showdownMaxStat("hp", 50)).toBe(362);
    expect(showdownMaxStat("spe", 50)).toBe(252);
  });

  it("caps width while retaining Showdown's continuous hue calculation", () => {
    expect(showdownStatBarScale(714, "hp", 100)).toMatchObject({
      percentage: 1,
      hue: 180,
      maxStat: 714,
    });
    expect(showdownStatBarScale(998, "atk", 100)).toMatchObject({
      percentage: 1,
      hue: 360,
      maxStat: 499,
    });
  });

  it("maps the Showdown hue to the nearest pixel-palette color", () => {
    expect(showdownStatBarScale(25, "atk", 100).colors.main).toBe(0xf04b36);
    expect(showdownStatBarScale(83, "atk", 100).colors.main).toBe(0xffb84f);
    expect(showdownStatBarScale(166, "atk", 100).colors.main).toBe(0xf1f75b);
    expect(showdownStatBarScale(333, "atk", 100).colors.main).toBe(0x8bdd63);
  });
});
