import type {
  BitmapFontDefinition,
  BitmapGlyph,
  TemplateDefinition,
} from "./types";
import { publicAssetUrl } from "./publicAssetUrl";

const largeFontUrl = publicAssetUrl("/assets/ui/font-large.png");
const smallFontUrl = publicAssetUrl("/assets/ui/font-small.png");
const panelBackgroundUrl = publicAssetUrl("/assets/ui/pokemon-overview.png");
const statPreviewBackgroundUrl = publicAssetUrl("/assets/ui/stat-preview.png");
const teamPreviewBackgroundUrl = publicAssetUrl("/assets/ui/team-preview.png");
const pokemonNameBackgroundUrl = publicAssetUrl("/assets/ui/pokemon-name.png");
const pokemonSpotlightBackgroundUrl = publicAssetUrl(
  "/assets/ui/pokemon-spotlight.png",
);
const pokemonSpotlightSmallBackgroundUrl = publicAssetUrl(
  "/assets/ui/pokemon-spotlight-small.png",
);
const moveOverviewBackgroundUrl = publicAssetUrl(
  "/assets/ui/move-overview.png",
);

function glyphs(
  tokens: string[],
  bounds: Array<[number, number]>,
  letterSpacing = 1,
): BitmapGlyph[] {
  return tokens.map((token, index) => {
    const [x, lastX] = bounds[index];
    const width = lastX - x + 1;
    return { token, x, width, height: 16, advance: width + letterSpacing };
  });
}

const alphabet = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

export const LARGE_FONT: BitmapFontDefinition = {
  sheetUrl: largeFontUrl,
  glyphs: glyphs(alphabet, [
    [0, 7],
    [10, 17],
    [20, 27],
    [30, 37],
    [40, 47],
    [50, 57],
    [60, 67],
    [70, 77],
    [80, 86],
    [89, 96],
    [99, 106],
    [109, 115],
    [118, 125],
    [128, 135],
    [138, 145],
    [148, 155],
    [157, 164],
    [167, 174],
    [177, 184],
    [186, 192],
    [195, 202],
    [205, 212],
    [215, 222],
    [225, 232],
    [235, 241],
    [244, 251],
  ]),
  lineHeight: 16,
  fallbackGlyph: "?",
};

export const POKEMON_NAME_FONT: BitmapFontDefinition = {
  ...LARGE_FONT,
  glyphs: LARGE_FONT.glyphs.map((glyph) => ({
    ...glyph,
    advance: glyph.width,
  })),
};

export const SMALL_FONT: BitmapFontDefinition = {
  sheetUrl: smallFontUrl,
  glyphs: [
    ...glyphs(
      [
        ...alphabet,
        ..."0123456789",
        "!",
        "?",
        ".",
        "Lv",
        "♂",
        "♀",
        "+",
        "-",
        "★",
        "/",
        "%",
        "'",
      ],
      [
        [0, 4],
        [6, 10],
        [12, 16],
        [18, 22],
        [24, 28],
        [30, 34],
        [36, 40],
        [42, 46],
        [48, 51],
        [53, 57],
        [59, 63],
        [65, 69],
        [71, 75],
        [77, 81],
        [83, 87],
        [89, 93],
        [95, 99],
        [101, 105],
        [107, 111],
        [113, 116],
        [118, 122],
        [124, 128],
        [130, 134],
        [136, 140],
        [142, 145],
        [147, 151],
        [153, 157],
        [160, 163],
        [165, 169],
        [171, 175],
        [177, 181],
        [183, 187],
        [189, 193],
        [195, 199],
        [201, 205],
        [207, 211],
        [213, 214],
        [216, 220],
        [222, 224],
        [226, 233],
        [235, 239],
        [241, 245],
        [247, 252],
        [254, 258],
        [260, 265],
        [267, 270],
        [272, 277],
        [279, 281],
      ],
      0,
    ),
  ],
  lineHeight: 16,
  spaceWidth: 2,
  fallbackGlyph: "?",
};

export const POKEMON_PANEL_TEMPLATE: TemplateDefinition = {
  id: "adv-pokemon-panel",
  label: "Pokémon overview",
  kind: "pokemon-overview",
  width: 399,
  height: 94,
  background: { url: panelBackgroundUrl },
  sprite: { x: -8, y: -2 },
  spriteMask: { x: 8, y: 16, width: 65, height: 64 },
  itemIcon: { x: 86, y: 60 },
  typeIcons: [
    { x: 325, y: 8 },
    { x: 359, y: 8 },
  ],
  moveRows: [20, 36, 52, 68],
  statRows: {
    hp: { x: 367, y: 19 },
    atk: { x: 367, y: 29 },
    def: { x: 367, y: 39 },
    spa: { x: 367, y: 49 },
    spd: { x: 367, y: 59 },
    spe: { x: 367, y: 69 },
  },
  statBars: {
    hp: { x: 303, y: 29, width: 60, height: 4 },
    atk: { x: 303, y: 39, width: 60, height: 4 },
    def: { x: 303, y: 49, width: 60, height: 4 },
    spa: { x: 303, y: 59, width: 60, height: 4 },
    spd: { x: 303, y: 69, width: 60, height: 4 },
    spe: { x: 303, y: 79, width: 60, height: 4 },
  },
  text: {
    name: { x: 10, y: 74, maxWidth: 69, size: 8, color: 0xffffff },
    level: { x: 90, y: 17, maxWidth: 19, size: 8, color: 0xffffff },
    ability: { x: 115, y: 20, maxWidth: 64, size: 8, color: 0xffffff },
    item: { x: 115, y: 68, maxWidth: 64, size: 8, color: 0xffffff },
    move: { x: 186, y: 0, maxWidth: 91, size: 8, color: 0xffffff },
    stat: { x: 0, y: 0, maxWidth: 58, size: 8, color: 0xffffff },
  },
};

export const STAT_PREVIEW_TEMPLATE: TemplateDefinition = {
  id: "adv-stat-preview",
  label: "Stat preview",
  kind: "stat-preview",
  width: 199,
  height: 100,
  filenameSuffix: "stat-preview",
  background: { url: statPreviewBackgroundUrl },
  hiddenPowerIcon: { x: 161, y: 80 },
  statRows: {
    hp: {
      base: { x: 25, y: 9 },
      bar: { x: 52, y: 19, width: 60, height: 4 },
      ev: { x: 124, y: 9 },
      iv: { x: 151, y: 9 },
      total: { x: 173, y: 9 },
    },
    atk: {
      base: { x: 25, y: 19 },
      bar: { x: 52, y: 29, width: 60, height: 4 },
      ev: { x: 124, y: 19 },
      iv: { x: 151, y: 19 },
      total: { x: 173, y: 19 },
    },
    def: {
      base: { x: 25, y: 29 },
      bar: { x: 52, y: 39, width: 60, height: 4 },
      ev: { x: 124, y: 29 },
      iv: { x: 151, y: 29 },
      total: { x: 173, y: 29 },
    },
    spa: {
      base: { x: 25, y: 39 },
      bar: { x: 52, y: 49, width: 60, height: 4 },
      ev: { x: 124, y: 39 },
      iv: { x: 151, y: 39 },
      total: { x: 173, y: 39 },
    },
    spd: {
      base: { x: 25, y: 49 },
      bar: { x: 52, y: 59, width: 60, height: 4 },
      ev: { x: 124, y: 49 },
      iv: { x: 151, y: 49 },
      total: { x: 173, y: 49 },
    },
    spe: {
      base: { x: 25, y: 59 },
      bar: { x: 52, y: 69, width: 60, height: 4 },
      ev: { x: 124, y: 59 },
      iv: { x: 151, y: 59 },
      total: { x: 173, y: 59 },
    },
  },
  text: {
    value: {
      x: 0,
      y: 0,
      maxWidth: 20,
      size: 8,
      color: 0xffffff,
      align: "right",
    },
    ev: {
      x: 0,
      y: 0,
      maxWidth: 15,
      size: 8,
      color: 0xffffff,
      align: "right",
    },
    natureSign: {
      x: 139,
      y: 0,
      maxWidth: 6,
      size: 8,
      color: 0xffffff,
      align: "left",
    },
    iv: {
      x: 0,
      y: 0,
      maxWidth: 10,
      size: 8,
      color: 0xffffff,
      align: "right",
    },
    nature: { x: 46, y: 76, maxWidth: 43, size: 8, color: 0xffffff },
  },
};

export const TEAM_PREVIEW_TEMPLATE: TemplateDefinition = {
  id: "adv-team-preview",
  label: "Team preview",
  kind: "team-preview",
  width: 261,
  height: 67,
  filenameSuffix: "team-preview",
  background: { url: teamPreviewBackgroundUrl },
  iconSlots: [
    { x: 8, y: 28 },
    { x: 49, y: 28 },
    { x: 90, y: 28 },
    { x: 131, y: 28 },
    { x: 172, y: 28 },
    { x: 213, y: 28 },
  ],
  text: {
    name: { x: 10, y: 1, maxWidth: 241, size: 16, color: 0xffffff },
  },
};

export const POKEMON_NAME_TEMPLATE: TemplateDefinition = {
  id: "adv-pokemon-name",
  label: "Pokémon name",
  kind: "pokemon-name",
  width: 80,
  height: 18,
  filenameSuffix: "name",
  background: { url: pokemonNameBackgroundUrl },
  capWidth: 3,
  paddingX: 2,
  textY: -3,
};

export const POKEMON_SPOTLIGHT_TEMPLATE: TemplateDefinition = {
  id: "adv-pokemon-spotlight",
  label: "Pokémon spotlight",
  kind: "pokemon-spotlight",
  width: 80,
  height: 84,
  filenameSuffix: "spotlight",
  background: { url: pokemonSpotlightBackgroundUrl },
  sprite: { x: -8, y: -6 },
  spriteMask: { x: 8, y: 12, width: 65, height: 64 },
};

export const POKEMON_SPOTLIGHT_SMALL_TEMPLATE: TemplateDefinition = {
  id: "adv-pokemon-spotlight-small",
  label: "Pokémon spotlight small",
  kind: "pokemon-spotlight-small",
  width: 43,
  height: 47,
  filenameSuffix: "spotlight-small",
  background: { url: pokemonSpotlightSmallBackgroundUrl },
  icon: { x: 2, y: 9 },
};

export const MOVE_OVERVIEW_TEMPLATE: TemplateDefinition = {
  id: "adv-move-overview",
  label: "Move overview",
  kind: "move-overview",
  width: 399,
  height: 34,
  filenameSuffix: "move",
  background: { url: moveOverviewBackgroundUrl },
  typeIcon: { x: 10, y: 10 },
  categoryIcon: { x: 46, y: 11 },
  statTextRight: 391,
  statTextGap: 6,
  text: {
    name: { x: 84, y: 1, maxWidth: 193, size: 16, color: 0xffffff },
    description: { x: 84, y: 11, maxWidth: 304, size: 8, color: 0xffffff },
    stat: {
      x: 0,
      y: 1,
      maxWidth: 0,
      size: 8,
      color: 0xffffff,
      align: "right",
    },
  },
};

export const TEMPLATES = new Map<string, TemplateDefinition>([
  [POKEMON_PANEL_TEMPLATE.id, POKEMON_PANEL_TEMPLATE],
  [STAT_PREVIEW_TEMPLATE.id, STAT_PREVIEW_TEMPLATE],
  [TEAM_PREVIEW_TEMPLATE.id, TEAM_PREVIEW_TEMPLATE],
  [POKEMON_NAME_TEMPLATE.id, POKEMON_NAME_TEMPLATE],
  [POKEMON_SPOTLIGHT_TEMPLATE.id, POKEMON_SPOTLIGHT_TEMPLATE],
  [POKEMON_SPOTLIGHT_SMALL_TEMPLATE.id, POKEMON_SPOTLIGHT_SMALL_TEMPLATE],
  [MOVE_OVERVIEW_TEMPLATE.id, MOVE_OVERVIEW_TEMPLATE],
]);
