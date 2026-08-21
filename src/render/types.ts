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
  align?: "left" | "center" | "right";
}

export type StatBarSlot = AtlasFrame;

export type StatId = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

interface BaseTemplateDefinition {
  id: string;
  label: string;
  width: number;
  height: number;
  background?: AssetSource;
  filenameSuffix?: string;
}

export interface PokemonOverviewTemplateDefinition extends BaseTemplateDefinition {
  kind: "pokemon-overview";
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

export interface StatPreviewTemplateDefinition extends BaseTemplateDefinition {
  kind: "stat-preview";
  hiddenPowerIcon: Point;
  statRows: Record<
    StatId,
    {
      base: Point;
      bar: StatBarSlot;
      ev: Point;
      iv: Point;
      total: Point;
    }
  >;
  text: {
    value: TextSlot;
    ev: TextSlot;
    natureSign: TextSlot;
    iv: TextSlot;
    nature: TextSlot;
  };
}

export interface TeamPreviewTemplateDefinition extends BaseTemplateDefinition {
  kind: "team-preview";
  iconSlots: Point[];
  text: {
    name: TextSlot;
  };
}

export interface PokemonNameTemplateDefinition extends BaseTemplateDefinition {
  kind: "pokemon-name";
  background: AssetSource;
  capWidth: number;
  paddingX: number;
  textY: number;
}

export interface PokemonSpotlightTemplateDefinition extends BaseTemplateDefinition {
  kind: "pokemon-spotlight";
  sprite: Point;
  spriteMask: AtlasFrame;
}

export interface PokemonSpotlightSmallTemplateDefinition extends BaseTemplateDefinition {
  kind: "pokemon-spotlight-small";
  icon: Point;
}

export interface MoveOverviewTemplateDefinition extends BaseTemplateDefinition {
  kind: "move-overview";
  typeIcon: Point;
  categoryIcon: Point;
  statTextRight: number;
  statTextGap: number;
  text: {
    name: TextSlot;
    description: TextSlot;
    stat: TextSlot;
  };
}

export type TemplateDefinition =
  | PokemonOverviewTemplateDefinition
  | StatPreviewTemplateDefinition
  | TeamPreviewTemplateDefinition
  | PokemonNameTemplateDefinition
  | PokemonSpotlightTemplateDefinition
  | PokemonSpotlightSmallTemplateDefinition
  | MoveOverviewTemplateDefinition;

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

export type RenderScale = 1 | 2 | 3 | 4 | 6 | 8 | 10;

export interface RenderOptions {
  templateId: string;
  scale: RenderScale;
}

export interface RenderedPanel {
  sourceSetIndex: number;
  set: Partial<PokemonSet>;
  speciesId: string;
  label: string;
  width: number;
  height: number;
  blob: Blob;
  previewUrl: string;
  filename: string;
}
