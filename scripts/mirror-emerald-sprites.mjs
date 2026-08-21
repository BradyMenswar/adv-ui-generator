import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const outputRoot = join(
  process.cwd(),
  "public",
  "assets",
  "bulbagarden",
  "emerald",
);
const numbers = Array.from({ length: 386 }, (_, index) =>
  String(index + 1).padStart(3, "0"),
);
const formNumbers = ["351S", "351R", "351H", "386S"];
const filenames = [...numbers, ...formNumbers].flatMap((number) => [
  `Spr_3e_${number}.png`,
  `Spr_3e_${number}_s.png`,
]);
const queue = [...filenames];
const failures = [];
let completed = 0;

async function mirror(filename) {
  const target = join(outputRoot, filename);
  const url = `https://archives.bulbagarden.net/wiki/Special:Redirect/file/${filename}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "adv-ui-generator asset mirror" },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
}

async function worker() {
  while (queue.length) {
    const filename = queue.shift();
    try {
      await mirror(filename);
      completed += 1;
      if (completed % 50 === 0) {
        process.stdout.write(`Mirrored ${completed}/${filenames.length}\n`);
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
}

await mkdir(outputRoot, { recursive: true });
await Promise.all(Array.from({ length: 8 }, () => worker()));

if (failures.length) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Mirrored ${filenames.length} normal and shiny Emerald sprites to ${outputRoot}\n`,
  );
}
