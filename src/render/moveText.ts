export function moveDescriptionText(
  shortDescription: string,
  description: string,
): string {
  const text = shortDescription || description || "No additional effect";
  return text.trim().replace(/\.+$/, "");
}

export function smallFontText(value: string): string {
  return value
    .replace(/’/g, "'")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿŒœ0-9.!?+/%'"“”‘,:_\-×()<> ]/gu, "");
}

const TYPE_BADGE_NAMES: Record<string, string> = {
  fighting: "Fight",
  flying: "Flying",
  poison: "Poison",
  ground: "Ground",
  rock: "Rock",
  bug: "Bug",
  ghost: "Ghost",
  steel: "Steel",
  fire: "Fire",
  water: "Water",
  grass: "Grass",
  electric: "Electr",
  psychic: "Psychc",
  ice: "Ice",
  dragon: "Dragon",
  dark: "Dark",
};

export function pokemonOverviewMoveText(moveName: string): string {
  const hiddenPower = /^Hidden Power(?:\s+(.+))?$/i.exec(moveName.trim());
  if (!hiddenPower?.[1]) return moveName;

  const badgeName = TYPE_BADGE_NAMES[hiddenPower[1].toLowerCase()];
  return badgeName ? `Hidden Power ${badgeName}` : moveName;
}

export function rightAlignedMoveStats(
  widths: { power: number; pp: number; accuracy: number },
  right: number,
  gap: number,
): { power: number; pp: number; accuracy: number } {
  const accuracy = right - widths.accuracy;
  const pp = accuracy - gap - widths.pp;
  const power = pp - gap - widths.power;
  return { power, pp, accuracy };
}

export function maximumMovePp(basePp: number, noPpBoosts = false): number {
  return noPpBoosts ? basePp : basePp + Math.floor(basePp / 5) * 3;
}
