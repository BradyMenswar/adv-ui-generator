import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { Dex } from "@pkmn/dex";
import { Icons } from "@pkmn/img";

const outputRoot = join(process.cwd(), "public", "assets", "showdown");
const menuOutputRoot = join(
  process.cwd(),
  "public",
  "assets",
  "bulbagarden",
  "menu",
);
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

const menuSpriteForms = {
  castformsunny: "351S",
  castformrainy: "351R",
  castformsnowy: "351H",
  deoxysattack: "386A",
  deoxysdefense: "386D",
  deoxysspeed: "386S",
};

const menuSpriteFilenames = new Set(
  species.map((pokemon) => {
    const number =
      menuSpriteForms[pokemon.id] ?? String(pokemon.num).padStart(3, "0");
    return `Ani${number}MS.png`;
  }),
);

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

async function mirrorMenuSprite(filename) {
  const target = join(menuOutputRoot, filename);
  const url = `https://archives.bulbagarden.net/wiki/Special:Redirect/file/${filename}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "adv-ui-generator asset mirror" },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
  return target;
}

const queue = [
  ...[...urls].map((url) => () => mirror(url)),
  ...[...menuSpriteFilenames].map(
    (filename) => () => mirrorMenuSprite(filename),
  ),
];
const totalJobs = queue.length;
const failures = [];
let completed = 0;

async function worker() {
  while (queue.length) {
    const job = queue.shift();
    try {
      await job();
      completed += 1;
      if (completed % 50 === 0) {
        process.stdout.write(`Mirrored ${completed}/${totalJobs}\n`);
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
    `Mirrored ${urls.size} Showdown assets to ${outputRoot}\n`,
  );
  process.stdout.write(
    `Mirrored ${menuSpriteFilenames.size} animated menu sprites to ${menuOutputRoot}\n`,
  );
}
