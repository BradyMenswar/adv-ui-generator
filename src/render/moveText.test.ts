import { describe, expect, it } from "vitest";

import {
  moveDescriptionText,
  maximumMovePp,
  pokemonOverviewMoveText,
  rightAlignedMoveStats,
  smallFontText,
} from "./moveText";

describe("moveDescriptionText", () => {
  it("uses the short description and removes its trailing period", () => {
    expect(
      moveDescriptionText("Raises the user's Attack by 2.", "Longer text."),
    ).toBe("Raises the user's Attack by 2");
  });

  it("falls back to the full description without a trailing period", () => {
    expect(moveDescriptionText("", "Has an additional effect.")).toBe(
      "Has an additional effect",
    );
  });

  it("supplies text when the move has no description", () => {
    expect(moveDescriptionText("", "")).toBe("No additional effect");
  });

  it("preserves mapped apostrophes in small-font text", () => {
    expect(smallFontText("User's move—it works")).toBe("User's moveit works");
  });

  it("uses type-badge abbreviations for Hidden Power in Pokémon overviews", () => {
    expect(pokemonOverviewMoveText("Hidden Power Electric")).toBe(
      "Hidden Power Electr",
    );
    expect(pokemonOverviewMoveText("Hidden Power Fighting")).toBe(
      "Hidden Power Fight",
    );
    expect(pokemonOverviewMoveText("Hidden Power Psychic")).toBe(
      "Hidden Power Psychc",
    );
  });

  it("leaves other move names and unknown Hidden Power suffixes unchanged", () => {
    expect(pokemonOverviewMoveText("Thunderbolt")).toBe("Thunderbolt");
    expect(pokemonOverviewMoveText("Hidden Power Stellar")).toBe(
      "Hidden Power Stellar",
    );
  });

  it("anchors move stats to accuracy with a fixed dynamic gap", () => {
    const widths = { power: 44, pp: 26, accuracy: 28 };
    const positions = rightAlignedMoveStats(widths, 391, 6);

    expect(positions.accuracy + widths.accuracy).toBe(391);
    expect(positions.accuracy - (positions.pp + widths.pp)).toBe(6);
    expect(positions.pp - (positions.power + widths.power)).toBe(6);
  });

  it("calculates maximum PP from three PP boosts", () => {
    expect(maximumMovePp(5)).toBe(8);
    expect(maximumMovePp(10)).toBe(16);
    expect(maximumMovePp(30)).toBe(48);
  });

  it("does not boost PP for moves that disallow it", () => {
    expect(maximumMovePp(1, true)).toBe(1);
  });
});
