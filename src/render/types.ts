import type { PokemonSet } from "@pkmn/sets";

export interface AtlasFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AssetSource {
  url: string;
  frame?: AtlasFrame;
}

export interface Point {
  x: number;
  y: number;
}

export interface TextSlot extends Point {
  maxWidth: number;
  size: number;
  color: number;
}

export type StatBarSlot = AtlasFrame;

export type StatId = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

export interface TemplateDefinition {
  id: string;
  width: number;
  height: number;
  background?: AssetSource;
  sprite: Point;
  spriteMask: AtlasFrame;
  itemIcon: Point;
  typeIcons: Point[];
  moveRows: number[];
  statRows: Record<StatId, Point>;
  statBars: Record<StatId, StatBarSlot>;
  text: {
    name: TextSlot;
    level: TextSlot;
    item: TextSlot;
    ability: TextSlot;
    move: TextSlot;
    stat: TextSlot;
  };
}

export interface BitmapGlyph {
  token: string;
  x: number;
  y?: number;
  width: number;
  height?: number;
  advance?: number;
}

export interface BitmapFontDefinition {
  sheetUrl: string;
  glyphs: BitmapGlyph[];
  lineHeight: number;
  spaceWidth?: number;
  fallbackGlyph: string;
}

export interface RenderOptions {
  templateId: string;
  scale: 1 | 2 | 3;
}

export interface RenderedPanel {
  sourceSetIndex: number;
  set: Partial<PokemonSet>;
  speciesId: string;
  width: number;
  height: number;
  blob: Blob;
  previewUrl: string;
  filename: string;
}
