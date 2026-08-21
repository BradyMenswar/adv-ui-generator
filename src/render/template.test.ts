import { describe, expect, it } from "vitest";

import { BitmapFontRenderer } from "./BitmapFontRenderer";
import {
  POKEMON_NAME_FONT,
  MOVE_OVERVIEW_TEMPLATE,
  POKEMON_NAME_TEMPLATE,
  POKEMON_SPOTLIGHT_SMALL_TEMPLATE,
  POKEMON_SPOTLIGHT_TEMPLATE,
  POKEMON_PANEL_TEMPLATE,
  SMALL_FONT,
  STAT_PREVIEW_TEMPLATE,
  TEAM_PREVIEW_TEMPLATE,
  TEMPLATES,
} from "./template";

describe("render templates", () => {
  it("registers all available layouts", () => {
    expect(TEMPLATES.get(POKEMON_PANEL_TEMPLATE.id)).toBe(
      POKEMON_PANEL_TEMPLATE,
    );
    expect(TEMPLATES.get(STAT_PREVIEW_TEMPLATE.id)).toBe(STAT_PREVIEW_TEMPLATE);
    expect(TEMPLATES.get(TEAM_PREVIEW_TEMPLATE.id)).toBe(TEAM_PREVIEW_TEMPLATE);
    expect(TEMPLATES.get(POKEMON_NAME_TEMPLATE.id)).toBe(POKEMON_NAME_TEMPLATE);
    expect(TEMPLATES.get(POKEMON_SPOTLIGHT_TEMPLATE.id)).toBe(
      POKEMON_SPOTLIGHT_TEMPLATE,
    );
    expect(TEMPLATES.get(POKEMON_SPOTLIGHT_SMALL_TEMPLATE.id)).toBe(
      POKEMON_SPOTLIGHT_SMALL_TEMPLATE,
    );
    expect(TEMPLATES.get(MOVE_OVERVIEW_TEMPLATE.id)).toBe(
      MOVE_OVERVIEW_TEMPLATE,
    );
  });

  it("matches the native move overview asset dimensions", () => {
    expect(MOVE_OVERVIEW_TEMPLATE).toMatchObject({
      kind: "move-overview",
      width: 399,
      height: 34,
      filenameSuffix: "move",
      typeIcon: { x: 10, y: 10 },
      categoryIcon: { x: 46, y: 11 },
      statTextRight: 391,
      statTextGap: 6,
    });
  });

  it("matches the native small Pokémon spotlight asset dimensions", () => {
    expect(POKEMON_SPOTLIGHT_SMALL_TEMPLATE).toMatchObject({
      kind: "pokemon-spotlight-small",
      width: 43,
      height: 47,
      filenameSuffix: "spotlight-small",
      icon: { x: 2, y: 9 },
    });
  });

  it("matches the native Pokémon spotlight asset dimensions", () => {
    expect(POKEMON_SPOTLIGHT_TEMPLATE).toMatchObject({
      kind: "pokemon-spotlight",
      width: 80,
      height: 84,
      filenameSuffix: "spotlight",
    });
  });

  it("sizes the Dragonite name plate to the supplied 80px reference", () => {
    if (POKEMON_NAME_TEMPLATE.kind !== "pokemon-name") {
      throw new Error("Expected the Pokémon-name template.");
    }
    const textWidth = new BitmapFontRenderer(POKEMON_NAME_FONT).measure(
      "DRAGONITE",
    );
    expect(
      textWidth +
        POKEMON_NAME_TEMPLATE.capWidth * 2 +
        POKEMON_NAME_TEMPLATE.paddingX * 2,
    ).toBe(80);
  });

  it("matches the native team-preview asset and six icon slots", () => {
    expect(TEAM_PREVIEW_TEMPLATE).toMatchObject({
      kind: "team-preview",
      width: 261,
      height: 67,
      filenameSuffix: "team-preview",
    });
    if (TEAM_PREVIEW_TEMPLATE.kind !== "team-preview") {
      throw new Error("Expected the team-preview template.");
    }
    expect(TEAM_PREVIEW_TEMPLATE.iconSlots).toHaveLength(6);
  });

  it("matches the native stat-preview asset dimensions", () => {
    expect(STAT_PREVIEW_TEMPLATE).toMatchObject({
      kind: "stat-preview",
      width: 199,
      height: 100,
      filenameSuffix: "stat-preview",
    });
  });

  it("registers the shiny marker in the small bitmap font", () => {
    expect(
      SMALL_FONT.glyphs.find((glyph) => glyph.token === "★"),
    ).toMatchObject({
      x: 260,
      width: 6,
      height: 16,
    });
  });

  it("registers the added small-font punctuation glyphs", () => {
    expect(
      Object.fromEntries(
        SMALL_FONT.glyphs
          .filter((glyph) => ["/", "%", "'"].includes(glyph.token))
          .map((glyph) => [glyph.token, [glyph.x, glyph.width]]),
      ),
    ).toEqual({
      "/": [267, 4],
      "%": [272, 6],
      "'": [279, 3],
    });
  });

  it("defines all six stat rows", () => {
    if (STAT_PREVIEW_TEMPLATE.kind !== "stat-preview") {
      throw new Error("Expected the stat-preview template.");
    }
    expect(Object.keys(STAT_PREVIEW_TEMPLATE.statRows)).toEqual([
      "hp",
      "atk",
      "def",
      "spa",
      "spd",
      "spe",
    ]);
  });
});
