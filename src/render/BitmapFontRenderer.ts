import { Assets, Container, Rectangle, Sprite, Text, Texture } from "pixi.js";

import type { BitmapFontDefinition, TextSlot } from "./types";

export class BitmapFontRenderer {
  constructor(private readonly definition?: BitmapFontDefinition) {}

  measure(text: string): number {
    if (!this.definition) return 0;

    const normalizedText = text.toUpperCase();
    const glyphs = [...this.definition.glyphs].sort(
      (left, right) => right.token.length - left.token.length,
    );
    let cursor = 0;
    let characterIndex = 0;
    let width = 0;

    while (characterIndex < normalizedText.length) {
      const remainder = normalizedText.slice(characterIndex);
      if (remainder.startsWith(" ")) {
        cursor += this.definition.spaceWidth ?? 3;
        width = cursor;
        characterIndex += 1;
        continue;
      }

      const matched = glyphs.find((glyph) =>
        remainder.startsWith(glyph.token.toUpperCase()),
      );
      const glyph =
        matched ??
        this.definition.glyphs.find(
          (candidate) => candidate.token === this.definition?.fallbackGlyph,
        );
      characterIndex += matched?.token.length ?? 1;
      if (!glyph) continue;

      width = cursor + glyph.width;
      cursor += glyph.advance ?? glyph.width + 1;
    }

    return width;
  }

  async create(text: string, slot: TextSlot): Promise<Container> {
    if (!this.definition) return this.createFallback(text, slot);

    const container = new Container();
    const source = await Assets.load<Texture>(this.definition.sheetUrl);
    const normalizedText = text.toUpperCase();
    const glyphs = [...this.definition.glyphs].sort(
      (left, right) => right.token.length - left.token.length,
    );
    let cursor = 0;
    let characterIndex = 0;

    while (characterIndex < normalizedText.length) {
      const remainder = normalizedText.slice(characterIndex);
      const matched = glyphs.find((glyph) =>
        remainder.startsWith(glyph.token.toUpperCase()),
      );
      const glyph =
        matched ??
        this.definition.glyphs.find(
          (candidate) => candidate.token === this.definition?.fallbackGlyph,
        );
      const consumed = matched?.token.length ?? 1;
      characterIndex += consumed;

      if (remainder.startsWith(" ")) {
        cursor += this.definition.spaceWidth ?? 3;
        continue;
      }
      if (!glyph) continue;
      const advance = glyph.advance ?? glyph.width + 1;
      if (cursor + advance > slot.maxWidth) break;

      const texture = new Texture({
        source: source.source,
        frame: new Rectangle(
          glyph.x,
          glyph.y ?? 0,
          glyph.width,
          glyph.height ?? this.definition.lineHeight,
        ),
      });
      const sprite = new Sprite(texture);
      sprite.x = cursor;
      container.addChild(sprite);
      cursor += advance;
    }

    container.x = slot.x + this.alignmentOffset(slot, cursor);
    container.y = slot.y;
    return container;
  }

  private createFallback(text: string, slot: TextSlot): Container {
    const container = new Container();
    const estimatedGlyphWidth = Math.max(1, Math.ceil(slot.size * 0.62));
    const maxCharacters = Math.floor(slot.maxWidth / estimatedGlyphWidth);
    const label = new Text({
      text: text.slice(0, maxCharacters),
      resolution: 1,
      style: {
        fontFamily: "monospace",
        fontSize: slot.size,
        fontWeight: "bold",
        fill: slot.color,
      },
    });
    label.roundPixels = true;
    label.x = this.alignmentOffset(slot, label.width);
    container.x = slot.x;
    container.y = slot.y;
    container.addChild(label);
    return container;
  }

  private alignmentOffset(slot: TextSlot, contentWidth: number): number {
    if (slot.align === "right") {
      return Math.round(slot.maxWidth - contentWidth);
    }
    if (slot.align === "center") {
      return Math.round((slot.maxWidth - contentWidth) / 2);
    }
    return 0;
  }
}
