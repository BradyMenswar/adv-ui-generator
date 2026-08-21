import { describe, expect, it } from "vitest";

import { BitmapFontRenderer } from "./BitmapFontRenderer";
import {
  GENERIC_TEXT_TEMPLATE,
  LARGE_FONT,
  POKEMON_NAME_FONT,
  MOVE_OVERVIEW_TEMPLATE,
  POKEMON_NAME_TEMPLATE,
  POKEMON_SPOTLIGHT_SMALL_TEMPLATE,
  POKEMON_SPOTLIGHT_TEMPLATE,
  POKEMON_PANEL_TEMPLATE,
  SMALL_FONT,
  STAT_PREVIEW_TEMPLATE,
  TEAM_PREVIEW_FONT,
  TEAM_PREVIEW_TEMPLATE,
  TITLE_FONT,
  TITLE_TEMPLATE,
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
    expect(TEMPLATES.get(TITLE_TEMPLATE.id)).toBe(TITLE_TEMPLATE);
    expect(TEMPLATES.get(GENERIC_TEXT_TEMPLATE.id)).toBe(GENERIC_TEXT_TEMPLATE);
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
      icon: { x: 6, y: 4 },
    });
  });

  it("matches the native Pokémon spotlight asset dimensions", () => {
    expect(POKEMON_SPOTLIGHT_TEMPLATE).toMatchObject({
      kind: "pokemon-spotlight",
      width: 80,
      height: 84,
      filenameSuffix: "spotlight",
      animatedSpriteOffset: { x: 0, y: -2 },
    });
  });

  it("moves Emerald battle sprites up two pixels in both full-size layouts", () => {
    expect(POKEMON_PANEL_TEMPLATE).toMatchObject({
      animatedSpriteOffset: { x: 0, y: -2 },
    });
    expect(POKEMON_SPOTLIGHT_TEMPLATE).toMatchObject({
      animatedSpriteOffset: { x: 0, y: -2 },
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

  it("reuses the dynamic name-plate geometry for custom titles", () => {
    expect(TITLE_TEMPLATE).toMatchObject({
      kind: "title",
      height: 18,
      capWidth: 3,
      paddingX: 2,
      textY: -3,
      minWidth: 6,
    });
  });

  it("defines the generic text nine-slice and two-pixel padding", () => {
    expect(GENERIC_TEXT_TEMPLATE).toMatchObject({
      kind: "generic-text",
      width: 94,
      height: 14,
      borderSize: 1,
      padding: 2,
      glyphHeight: 8,
      lineHeight: 10,
    });
  });

  it("wraps small-font text at words and explicit line breaks", () => {
    const font = new BitmapFontRenderer(SMALL_FONT);
    expect(font.wrap("ROCK SLIDE", 25)).toEqual(["ROCK", "SLIDE"]);
    expect(font.wrap("FIRST\nSECOND", 100)).toEqual(["FIRST", "SECOND"]);
    expect(font.wrap("", 25)).toEqual([""]);
  });

  it("sizes auto-width generic text from its longest explicit line", () => {
    if (GENERIC_TEXT_TEMPLATE.kind !== "generic-text") {
      throw new Error("Expected the generic-text template.");
    }
    const lines = ["SHORT", "THIS IS THE LONGEST LINE"];
    const longestLine = Math.max(
      ...lines.map((line) => new BitmapFontRenderer(SMALL_FONT).measure(line)),
    );
    const panelInset =
      2 * (GENERIC_TEXT_TEMPLATE.borderSize + GENERIC_TEXT_TEMPLATE.padding);

    expect(longestLine + panelInset).toBe(108);
    expect(
      GENERIC_TEXT_TEMPLATE.borderSize * 2 +
        GENERIC_TEXT_TEMPLATE.padding * 2 +
        GENERIC_TEXT_TEMPLATE.glyphHeight +
        (lines.length - 1) * GENERIC_TEXT_TEMPLATE.lineHeight,
    ).toBe(24);
  });

  it("maps the lower punctuation row in the small font", () => {
    expect(
      SMALL_FONT.glyphs
        .filter((glyph) => ["%", "(", ")", "<", ">"].includes(glyph.token))
        .map(({ token, x, y, width, height }) => ({
          token,
          x,
          y,
          width,
          height,
        })),
    ).toEqual([
      { token: "%", x: 88, y: 130, width: 5, height: 8 },
      { token: "(", x: 96, y: 130, width: 3, height: 8 },
      { token: ")", x: 102, y: 130, width: 3, height: 8 },
      { token: "<", x: 108, y: 130, width: 5, height: 8 },
      { token: ">", x: 116, y: 130, width: 5, height: 8 },
    ]);
  });

  it("preserves case for custom titles without changing Pokémon names", () => {
    expect(new BitmapFontRenderer(TITLE_FONT).measure("Aa")).toBe(15);
    expect(new BitmapFontRenderer(POKEMON_NAME_FONT).measure("Aa")).toBe(16);
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
    expect(TEAM_PREVIEW_TEMPLATE.iconSlots).toEqual([
      { x: 12, y: 21 },
      { x: 53, y: 21 },
      { x: 94, y: 21 },
      { x: 135, y: 21 },
      { x: 176, y: 21 },
      { x: 217, y: 21 },
    ]);
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
      x: 92,
      y: 142,
      width: 6,
      height: 10,
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
      "/": [155, 5],
      "%": [88, 5],
      "'": [114, 3],
    });
    expect(
      SMALL_FONT.glyphs.find((glyph) => glyph.token === "'")?.offsetY,
    ).toBe(8);
  });

  it("maps the expanded Latin and punctuation rows", () => {
    expect(
      Object.fromEntries(
        ["a", "ü", "À", "œ", "?", "♀"].map((token) => {
          const glyph = SMALL_FONT.glyphs.find(
            (candidate) => candidate.token === token,
          );
          return [token, [glyph?.x, glyph?.y, glyph?.width]];
        }),
      ),
    ).toEqual({
      a: [0, 28, 5],
      ü: [47, 39, 5],
      À: [0, 101, 5],
      œ: [86, 116, 6],
      "?": [65, 0, 5],
      "♀": [125, 0, 5],
    });
    expect(
      LARGE_FONT.glyphs.find((glyph) => glyph.token === "a"),
    ).toMatchObject({ x: 1, y: 54, width: 7 });
  });

  it("places lowercase letters and digits one pixel below capitals", () => {
    expect(
      LARGE_FONT.glyphs.find((glyph) => glyph.token === "A")?.offsetY,
    ).toBe(8);
    expect(
      LARGE_FONT.glyphs.find((glyph) => glyph.token === "a")?.offsetY,
    ).toBe(9);
    expect(
      LARGE_FONT.glyphs.find((glyph) => glyph.token === "s")?.offsetY,
    ).toBe(8);
    expect(
      LARGE_FONT.glyphs.find((glyph) => glyph.token === "1")?.offsetY,
    ).toBe(9);
    expect(
      SMALL_FONT.glyphs.find((glyph) => glyph.token === "a")?.offsetY,
    ).toBe(8);
    expect(
      SMALL_FONT.glyphs.find((glyph) => glyph.token === "1")?.offsetY,
    ).toBe(6);
  });

  it("aligns title and team-preview digits with capital letters", () => {
    expect(
      TITLE_FONT.glyphs.find((glyph) => glyph.token === "A")?.offsetY,
    ).toBe(8);
    expect(
      TITLE_FONT.glyphs.find((glyph) => glyph.token === "1")?.offsetY,
    ).toBe(8);
    expect(
      TEAM_PREVIEW_FONT.glyphs.find((glyph) => glyph.token === "1")?.offsetY,
    ).toBe(8);
    expect(
      POKEMON_NAME_FONT.glyphs.find((glyph) => glyph.token === "1")?.offsetY,
    ).toBe(9);
  });

  it("requires explicit bracketed tokens for font icons", () => {
    const font = new BitmapFontRenderer(SMALL_FONT);
    expect(font.measure("ID")).toBe(9);
    expect(font.measure("[ID]")).toBe(7);
    expect(font.measure("NO")).toBe(10);
    expect(font.measure("[NO]")).toBe(8);
  });

  it("keeps every mapped glyph inside its font sheet", () => {
    for (const [font, width, height] of [
      [LARGE_FONT, 157, 87],
      [SMALL_FONT, 169, 152],
    ] as const) {
      for (const glyph of font.glyphs) {
        expect(glyph.x + glyph.width).toBeLessThanOrEqual(width);
        expect(
          (glyph.y ?? 0) + (glyph.height ?? font.lineHeight),
        ).toBeLessThanOrEqual(height);
      }
    }
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
