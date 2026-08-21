import { Teams } from "@pkmn/sets";
import { describe, expect, it } from "vitest";

import { showdownAssets } from "./assets";
import { ADV_DEX, parseAdvTeam } from "./team";

const COMPLETE_SET = `Sparky (Zapdos) @ Leftovers
Ability: Pressure
Level: 50
Shiny: Yes
EVs: 4 HP / 252 SpA / 252 Spe
Timid Nature
IVs: 2 Atk / 30 Def
- Thunderbolt
- Hidden Power [Ice]
- Baton Pass
- Roar`;

describe("parseAdvTeam", () => {
  it("preserves the direct Showdown-compatible import result", () => {
    const direct = Teams.importTeam(COMPLETE_SET, ADV_DEX);
    const parsed = parseAdvTeam(COMPLETE_SET);

    expect(direct).toBeDefined();
    expect(parsed.sets).toEqual(direct?.team);
    expect(parsed.issues).toEqual([]);
    expect(parsed.sets[0]).toMatchObject({
      name: "Sparky",
      species: "Zapdos",
      item: "Leftovers",
      ability: "Pressure",
      level: 50,
      shiny: true,
      nature: "Timid",
      moves: ["Thunderbolt", "Hidden Power Ice", "Baton Pass", "Roar"],
    });
  });

  it("accepts Showdown packed-team input", () => {
    const imported = Teams.importTeam(COMPLETE_SET, ADV_DEX)!;
    const packed = imported.pack();
    const directPackedImport = Teams.importTeam(packed, ADV_DEX)!;
    expect(parseAdvTeam(packed).sets).toEqual(directPackedImport.team);
  });

  it("preserves Frustration happiness behavior", () => {
    const parsed = parseAdvTeam(`Tauros @ Choice Band
Ability: Intimidate
- Frustration
- Earthquake
- Hidden Power [Ghost]
- Double-Edge`);
    expect(parsed.sets[0].happiness).toBe(0);
    expect(parsed.sets[0].moves).toContain("Hidden Power Ghost");
  });

  it("reports later-generation data without blocking valid sets", () => {
    const parsed = parseAdvTeam(`Tyranitar @ Leftovers
Ability: Sand Stream
- Rock Slide

Garchomp @ Choice Scarf
Ability: Rough Skin
- Dragon Claw`);
    expect(parsed.sets).toHaveLength(2);
    expect(parsed.issues.some((issue) => issue.setIndex === 1)).toBe(true);
    expect(parsed.issues.some((issue) => issue.setIndex === 0)).toBe(false);
  });

  it("returns an actionable issue for empty input", () => {
    expect(parseAdvTeam("   ")).toEqual({
      sets: [],
      issues: [{ message: "No Pokémon sets were found in the pasted team." }],
    });
  });
});

describe("Showdown asset adapter", () => {
  it("uses pinned local sprite paths", () => {
    expect(showdownAssets.pokemonSprite("Tyranitar").url).toBe(
      "/assets/showdown/sprites/gen3/tyranitar.png",
    );
    expect(showdownAssets.pokemonSprite("Tyranitar", { shiny: true }).url).toBe(
      "/assets/showdown/sprites/gen3-shiny/tyranitar.png",
    );
  });

  it("preserves Showdown item and Pokémon sheet coordinates", () => {
    expect(showdownAssets.itemIcon("Leftovers").frame).toEqual({
      x: 48,
      y: 360,
      width: 24,
      height: 24,
    });
    expect(showdownAssets.pokemonIcon("Tyranitar").frame).toEqual({
      x: 320,
      y: 600,
      width: 40,
      height: 30,
    });
  });

  it("uses the 16-pixel row stride of the local type atlas", () => {
    expect(showdownAssets.typeIcon("Rock").frame).toEqual({
      x: 32,
      y: 16,
      width: 32,
      height: 15,
    });
    expect(showdownAssets.typeIcon("Psychic").frame).toEqual({
      x: 64,
      y: 48,
      width: 32,
      height: 15,
    });
    expect(showdownAssets.typeIcon("Dark").frame).toEqual({
      x: 32,
      y: 64,
      width: 32,
      height: 15,
    });
  });

  it("uses the three local move category frames", () => {
    expect(showdownAssets.moveCategoryIcon("Physical").frame).toEqual({
      x: 32,
      y: 0,
      width: 32,
      height: 14,
    });
    expect(showdownAssets.moveCategoryIcon("Special").frame).toEqual({
      x: 0,
      y: 0,
      width: 32,
      height: 14,
    });
    expect(showdownAssets.moveCategoryIcon("Status").frame).toEqual({
      x: 64,
      y: 0,
      width: 32,
      height: 14,
    });
  });
});
