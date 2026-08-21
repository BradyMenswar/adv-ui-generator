import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { Dex } from "@pkmn/dex";
import { Icons, Sprites } from "@pkmn/img";

const outputRoot = join(process.cwd(), "public", "assets", "showdown");
const dex = Dex.forGen(3);
const species = dex.species
  .all()
  .filter(
    (entry) =>
      entry.exists && entry.num > 0 && entry.gen <= 3 && !entry.isNonstandard,
  );

const urls = new Set([
  Icons.getPokemon("Pikachu").url,
  Icons.getItem("Leftovers").url,
]);

for (const pokemon of species) {
  urls.add(Sprites.getPokemon(pokemon.name, { gen: 3 }).url);
  urls.add(Sprites.getPokemon(pokemon.name, { gen: 3, shiny: true }).url);
}

function outputPath(url) {
  const pathname = new URL(url).pathname.replace(/^\//, "");
  return join(outputRoot, pathname.replace(/^sprites\//, "sprites/"));
}

async function mirror(url) {
  const target = outputPath(url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
  return target;
}

const queue = [...urls];
const failures = [];
let completed = 0;

async function worker() {
  while (queue.length) {
    const url = queue.shift();
    try {
      await mirror(url);
      completed += 1;
      if (completed % 50 === 0) {
        process.stdout.write(`Mirrored ${completed}/${urls.size}\n`);
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
}

await Promise.all(Array.from({ length: 12 }, () => worker()));

if (failures.length) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Mirrored ${completed} Showdown assets to ${outputRoot}\n`,
  );
}
