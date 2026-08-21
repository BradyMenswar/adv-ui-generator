import { Dex } from "@pkmn/dex";
import { Teams, type PokemonSet } from "@pkmn/sets";

export const ADV_DEX = Dex.forGen(3);

export interface TeamIssue {
  message: string;
  setIndex?: number;
}

export interface ParsedAdvTeam {
  sets: Partial<PokemonSet>[];
  issues: TeamIssue[];
}

function validateSet(set: Partial<PokemonSet>, setIndex: number): TeamIssue[] {
  const issues: TeamIssue[] = [];
  const species = ADV_DEX.species.get(set.species ?? "");

  if (
    !species.exists ||
    species.gen > 3 ||
    species.isNonstandard === "Future"
  ) {
    issues.push({
      setIndex,
      message: `Pokémon ${set.species || "(missing species)"} is not available in Gen 3.`,
    });
  }

  if (set.item) {
    const item = ADV_DEX.items.get(set.item);
    if (!item.exists || item.gen > 3 || item.isNonstandard === "Future") {
      issues.push({
        setIndex,
        message: `Item ${set.item} is not available in Gen 3.`,
      });
    }
  }

  if (set.ability) {
    const ability = ADV_DEX.abilities.get(set.ability);
    if (
      !ability.exists ||
      ability.gen > 3 ||
      ability.isNonstandard === "Future"
    ) {
      issues.push({
        setIndex,
        message: `Ability ${set.ability} is not available in Gen 3.`,
      });
    }
  }

  for (const moveName of set.moves ?? []) {
    const move = ADV_DEX.moves.get(moveName);
    if (!move.exists || move.gen > 3 || move.isNonstandard === "Future") {
      issues.push({
        setIndex,
        message: `Move ${moveName} is not available in Gen 3.`,
      });
    }
  }

  return issues;
}

export function parseAdvTeam(input: string): ParsedAdvTeam {
  const imported = Teams.importTeam(input, ADV_DEX);
  if (!imported?.team.length) {
    return {
      sets: [],
      issues: [{ message: "No Pokémon sets were found in the pasted team." }],
    };
  }

  const issues: TeamIssue[] = [];
  if (imported.team.length > 6) {
    issues.push({
      message: `The paste contains ${imported.team.length} sets; only the first six will be rendered.`,
    });
  }

  const sets = imported.team.slice(0, 6);
  sets.forEach((set, index) => issues.push(...validateSet(set, index)));

  return { sets, issues };
}
