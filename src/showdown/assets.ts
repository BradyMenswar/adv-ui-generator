import { Icons, Sprites } from "@pkmn/img";

import { publicAssetUrl } from "../render/publicAssetUrl";
import type { AssetSource } from "../render/types";
import { ADV_DEX } from "./team";

const TYPE_SHEET = publicAssetUrl("/assets/ui/types.png");
const MOVE_CATEGORY_SHEET = publicAssetUrl("/assets/ui/move-categories.png");
const TYPE_FRAMES: Record<string, { x: number; y: number }> = {
  normal: { x: 0, y: 0 },
  fighting: { x: 32, y: 0 },
  flying: { x: 64, y: 0 },
  poison: { x: 96, y: 0 },
  ground: { x: 0, y: 16 },
  rock: { x: 32, y: 16 },
  bug: { x: 64, y: 16 },
  ghost: { x: 96, y: 16 },
  steel: { x: 0, y: 32 },
  fire: { x: 64, y: 32 },
  water: { x: 96, y: 32 },
  grass: { x: 0, y: 48 },
  electric: { x: 32, y: 48 },
  psychic: { x: 64, y: 48 },
  ice: { x: 96, y: 48 },
  dragon: { x: 0, y: 64 },
  dark: { x: 32, y: 64 },
};
const MOVE_CATEGORY_FRAMES: Record<string, { x: number; y: number }> = {
  special: { x: 0, y: 0 },
  physical: { x: 32, y: 0 },
  status: { x: 64, y: 0 },
};
const MENU_SPRITE_FORMS: Record<string, string> = {
  castformsunny: "351S",
  castformrainy: "351R",
  castformsnowy: "351H",
  deoxysattack: "386A",
  deoxysdefense: "386D",
  deoxysspeed: "386S",
};

function localizeShowdownUrl(url: string): string {
  const parsed = new URL(url);
  return publicAssetUrl(`/assets/showdown${parsed.pathname}`);
}

export const showdownAssets = {
  pokemonSprite(
    species: string,
    options: { shiny?: boolean } = {},
  ): AssetSource {
    const sprite = Sprites.getPokemon(species, {
      gen: 3,
      shiny: options.shiny,
    });
    return { url: localizeShowdownUrl(sprite.url) };
  },

  pokemonIcon(species: string, gender?: string): AssetSource {
    const icon = Icons.getPokemon(species, {
      gender: gender === "F" ? "F" : gender === "M" ? "M" : undefined,
    });
    return {
      url: localizeShowdownUrl(icon.url),
      frame: { x: -icon.left, y: -icon.top, width: 40, height: 30 },
    };
  },

  pokemonMenuSprite(species: string): AssetSource {
    const pokemon = ADV_DEX.species.get(species);
    const number =
      MENU_SPRITE_FORMS[pokemon.id] ?? String(pokemon.num).padStart(3, "0");
    return {
      url: publicAssetUrl(`/assets/bulbagarden/menu/Ani${number}MS.png`),
    };
  },

  itemIcon(item: string): AssetSource {
    const icon = Icons.getItem(item);
    return {
      url: localizeShowdownUrl(icon.url),
      frame: { x: -icon.left, y: -icon.top, width: 24, height: 24 },
    };
  },

  typeIcon(type: string): AssetSource {
    const frame = TYPE_FRAMES[type.toLowerCase()];
    if (!frame) throw new Error(`No local type badge exists for ${type}.`);
    return {
      url: TYPE_SHEET,
      frame: { ...frame, width: 32, height: 15 },
    };
  },

  moveCategoryIcon(category: string): AssetSource {
    const frame = MOVE_CATEGORY_FRAMES[category.toLowerCase()];
    if (!frame)
      throw new Error(`No local move category icon exists for ${category}.`);
    return {
      url: MOVE_CATEGORY_SHEET,
      frame: { ...frame, width: 32, height: 14 },
    };
  },
};
