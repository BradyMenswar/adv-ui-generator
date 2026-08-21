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
const genericTextBackgroundUrl = publicAssetUrl("/assets/ui/generic-text.png");
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
  options: {
    y: number;
    height: number;
    offsetY?: number;
    letterSpacing?: number;
  },
): BitmapGlyph[] {
  return tokens.map((token, index) => {
    const [x, lastX] = bounds[index];
    const width = lastX - x + 1;
    return {
      token,
      x,
      y: options.y,
      offsetY: options.offsetY ?? 8,
      width,
      height: options.height,
      advance: width + (options.letterSpacing ?? 1),
    };
  });
}

const alphabet = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const lowercaseAlphabet = [..."abcdefghijklmnopqrstuvwxyz"];

const largeGlyphs: BitmapGlyph[] = [
  ...glyphs(
    [..."0123456789!?.-_"],
    [
      [1, 8],
      [11, 17],
      [20, 27],
      [30, 37],
      [40, 47],
      [50, 57],
      [60, 67],
      [70, 77],
      [80, 87],
      [90, 97],
      [100, 104],
      [107, 114],
      [117, 120],
      [123, 129],
      [132, 134],
    ],
    { y: 0, height: 8 },
  ),
  ...glyphs(
    ['"', "“", "”", "‘", "’", "♂", "♀", "¥", ",", "×", "/"],
    [
      [1, 6],
      [9, 14],
      [17, 22],
      [25, 28],
      [31, 34],
      [37, 42],
      [45, 50],
      [53, 60],
      [63, 65],
      [68, 73],
      [76, 83],
    ],
    { y: 13, height: 8 },
  ),
  ...glyphs(
    alphabet.slice(0, 16),
    [
      [1, 8],
      [11, 18],
      [21, 28],
      [31, 38],
      [41, 48],
      [51, 58],
      [61, 68],
      [71, 78],
      [81, 87],
      [90, 97],
      [100, 107],
      [110, 116],
      [119, 126],
      [129, 136],
      [139, 146],
      [149, 156],
    ],
    { y: 26, height: 8 },
  ),
  ...glyphs(
    alphabet.slice(16),
    [
      [1, 8],
      [11, 18],
      [21, 28],
      [30, 36],
      [39, 46],
      [49, 56],
      [59, 66],
      [69, 76],
      [79, 85],
      [88, 95],
    ],
    { y: 40, height: 8 },
  ),
  ...glyphs(
    lowercaseAlphabet.slice(0, 18),
    [
      [1, 7],
      [10, 16],
      [19, 25],
      [28, 34],
      [37, 43],
      [46, 51],
      [54, 60],
      [63, 69],
      [72, 74],
      [76, 82],
      [85, 91],
      [94, 97],
      [100, 107],
      [110, 116],
      [119, 125],
      [128, 134],
      [137, 143],
      [146, 151],
    ],
    { y: 54, height: 7 },
  ),
  ...glyphs(
    [...lowercaseAlphabet.slice(18), "▶", ":"],
    [
      [1, 6],
      [9, 13],
      [16, 22],
      [25, 31],
      [34, 41],
      [44, 51],
      [54, 60],
      [63, 69],
      [72, 77],
      [80, 81],
    ],
    { y: 65, height: 8 },
  ),
  ...glyphs(
    [..."ÄÖÜäöü"],
    [
      [1, 8],
      [11, 18],
      [21, 28],
      [31, 37],
      [40, 46],
      [49, 55],
    ],
    { y: 79, height: 8, offsetY: 6 },
  ),
];

function aliases(
  tokens: string[],
  sourceToken: string,
  sourceGlyphs: BitmapGlyph[],
): BitmapGlyph[] {
  const source = sourceGlyphs.find((glyph) => glyph.token === sourceToken);
  if (!source) return [];
  return tokens.map((token) => ({ ...source, token }));
}

function adjustLowercaseAndDigitBaseline(
  glyphsToAdjust: BitmapGlyph[],
  alignedLowercaseRows: number[] = [],
): BitmapGlyph[] {
  return glyphsToAdjust.map((glyph) => {
    const isSingleCharacter = [...glyph.token].length === 1;
    const isLowercase = isSingleCharacter && /\p{Ll}/u.test(glyph.token);
    const isDigit = isSingleCharacter && /\p{N}/u.test(glyph.token);
    const lowercaseAlreadyAligned =
      isLowercase && alignedLowercaseRows.includes(glyph.y ?? 0);
    return (isLowercase || isDigit) && !lowercaseAlreadyAligned
      ? { ...glyph, offsetY: (glyph.offsetY ?? 0) + 1 }
      : glyph;
  });
}

const adjustedLargeGlyphs = adjustLowercaseAndDigitBaseline(largeGlyphs, [65]);

export const LARGE_FONT: BitmapFontDefinition = {
  sheetUrl: largeFontUrl,
  glyphs: [
    ...adjustedLargeGlyphs,
    ...aliases(["'"], "’", adjustedLargeGlyphs),
    ...aliases(["$", "₽"], "¥", adjustedLargeGlyphs),
  ],
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

export const TITLE_FONT: BitmapFontDefinition = {
  ...POKEMON_NAME_FONT,
  glyphs: POKEMON_NAME_FONT.glyphs.map((glyph) =>
    /^\p{N}$/u.test(glyph.token)
      ? { ...glyph, offsetY: (glyph.offsetY ?? 0) - 1 }
      : glyph,
  ),
  textTransform: "preserve",
};

const smallGlyphs: BitmapGlyph[] = [
  ...glyphs(
    [
      ..."0123456789!?.-_",
      '"',
      "“",
      "”",
      "‘",
      "’",
      "♂",
      "♀",
      "¥",
      ",",
      "×",
      "/",
    ],
    [
      [0, 4],
      [7, 10],
      [12, 16],
      [18, 22],
      [24, 28],
      [30, 34],
      [36, 40],
      [42, 46],
      [48, 52],
      [54, 58],
      [61, 62],
      [65, 69],
      [72, 74],
      [77, 81],
      [84, 86],
      [89, 93],
      [95, 99],
      [101, 105],
      [108, 110],
      [114, 116],
      [119, 123],
      [125, 129],
      [133, 137],
      [141, 143],
      [147, 152],
      [155, 159],
    ],
    { y: 0, height: 11, offsetY: 5, letterSpacing: 0 },
  ),
  ...glyphs(
    alphabet,
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
    ],
    { y: 15, height: 8, letterSpacing: 0 },
  ),
  ...glyphs(
    lowercaseAlphabet,
    [
      [0, 4],
      [6, 10],
      [12, 16],
      [18, 22],
      [24, 28],
      [30, 34],
      [36, 40],
      [42, 46],
      [49, 50],
      [53, 56],
      [59, 63],
      [66, 67],
      [70, 74],
      [76, 80],
      [82, 86],
      [88, 92],
      [94, 98],
      [100, 104],
      [106, 110],
      [112, 116],
      [118, 122],
      [124, 128],
      [130, 134],
      [136, 140],
      [142, 146],
      [148, 152],
    ],
    { y: 28, height: 9, offsetY: 7, letterSpacing: 0 },
  ),
  ...glyphs(
    ["▶", ":", ..."ÄÖÜäöü", "Lv", "[PP]", "[ID]", "[NO]"],
    [
      [2, 7],
      [11, 13],
      [17, 21],
      [23, 27],
      [29, 33],
      [35, 39],
      [41, 45],
      [47, 51],
      [53, 60],
      [62, 69],
      [72, 78],
      [80, 87],
    ],
    { y: 39, height: 10, offsetY: 6, letterSpacing: 0 },
  ),
  ...glyphs(
    ["↑", "↓", "←", "→", "+"],
    [
      [0, 6],
      [8, 14],
      [16, 22],
      [24, 30],
      [32, 37],
    ],
    { y: 51, height: 7, letterSpacing: 0 },
  ),
  ...glyphs(
    [..."ÀÁÂÇÈÉÊËÌÍÎÏÒÓÔŒÙÚÛÑß"],
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
      [53, 56],
      [58, 61],
      [63, 66],
      [68, 72],
      [74, 78],
      [80, 84],
      [86, 90],
      [92, 96],
      [98, 102],
      [104, 108],
      [110, 114],
      [116, 120],
    ],
    { y: 101, height: 12, offsetY: 5, letterSpacing: 0 },
  ),
  ...glyphs(
    [..."àáâçèéêëìíîïòóôœùúûñ"],
    [
      [0, 4],
      [6, 10],
      [12, 16],
      [18, 21],
      [24, 28],
      [30, 34],
      [36, 40],
      [42, 46],
      [49, 50],
      [54, 55],
      [59, 60],
      [64, 65],
      [68, 72],
      [74, 78],
      [80, 84],
      [86, 91],
      [93, 97],
      [99, 103],
      [105, 109],
      [111, 115],
    ],
    { y: 116, height: 10, offsetY: 5, letterSpacing: 0 },
  ),
  ...glyphs(
    ["%", "(", ")", "<", ">"],
    [
      [88, 92],
      [96, 98],
      [102, 104],
      [108, 112],
      [116, 120],
    ],
    { y: 130, height: 8, letterSpacing: 0 },
  ),
  ...glyphs(
    ["[PK]", "[MN]", "[POKEBLOCK]", "↑", "↓", "←", "→", "★"],
    [
      [0, 15],
      [18, 33],
      [35, 58],
      [60, 66],
      [68, 74],
      [76, 82],
      [84, 90],
      [92, 97],
    ],
    { y: 142, height: 10, offsetY: 6, letterSpacing: 0 },
  ),
];

const adjustedSmallGlyphs = adjustLowercaseAndDigitBaseline(smallGlyphs).map(
  (glyph) =>
    ['"', "“", "”", "‘", "’"].includes(glyph.token)
      ? { ...glyph, offsetY: 8 }
      : glyph,
);

export const SMALL_FONT: BitmapFontDefinition = {
  sheetUrl: smallFontUrl,
  glyphs: [
    ...adjustedSmallGlyphs,
    ...aliases(["'"], "’", adjustedSmallGlyphs),
    ...aliases(["$", "₽"], "¥", adjustedSmallGlyphs),
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

const SMALL_SPOTLIGHT_ICON_SLOT = { x: 6, y: 4 };
const TEAM_PREVIEW_SQUARE_OFFSET = { x: 6, y: 17 };
const TEAM_PREVIEW_SQUARE_STEP = 41;

export const TEAM_PREVIEW_TEMPLATE: TemplateDefinition = {
  id: "adv-team-preview",
  label: "Team preview",
  kind: "team-preview",
  width: 261,
  height: 67,
  filenameSuffix: "team-preview",
  background: { url: teamPreviewBackgroundUrl },
  iconSlots: Array.from({ length: 6 }, (_, index) => ({
    x:
      TEAM_PREVIEW_SQUARE_OFFSET.x +
      SMALL_SPOTLIGHT_ICON_SLOT.x +
      TEAM_PREVIEW_SQUARE_STEP * index,
    y: TEAM_PREVIEW_SQUARE_OFFSET.y + SMALL_SPOTLIGHT_ICON_SLOT.y,
  })),
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
  minWidth: 6,
};

export const TITLE_TEMPLATE: TemplateDefinition = {
  id: "adv-title",
  label: "Custom title",
  kind: "title",
  width: 80,
  height: 18,
  filenameSuffix: "title",
  background: { url: pokemonNameBackgroundUrl },
  capWidth: 3,
  paddingX: 2,
  textY: -3,
  minWidth: 6,
};

export const GENERIC_TEXT_TEMPLATE: TemplateDefinition = {
  id: "adv-generic-text",
  label: "Generic text",
  kind: "generic-text",
  width: 94,
  height: 14,
  filenameSuffix: "generic-text",
  background: { url: genericTextBackgroundUrl },
  borderSize: 1,
  padding: 2,
  textOffsetY: -5,
  glyphHeight: 8,
  lineHeight: 10,
  minWidth: 32,
  maxWidth: 399,
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
  icon: { ...SMALL_SPOTLIGHT_ICON_SLOT },
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
  [TITLE_TEMPLATE.id, TITLE_TEMPLATE],
  [GENERIC_TEXT_TEMPLATE.id, GENERIC_TEXT_TEMPLATE],
  [POKEMON_SPOTLIGHT_TEMPLATE.id, POKEMON_SPOTLIGHT_TEMPLATE],
  [POKEMON_SPOTLIGHT_SMALL_TEMPLATE.id, POKEMON_SPOTLIGHT_SMALL_TEMPLATE],
  [MOVE_OVERVIEW_TEMPLATE.id, MOVE_OVERVIEW_TEMPLATE],
]);
