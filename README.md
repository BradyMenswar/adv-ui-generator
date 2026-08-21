# ADV Image Generator

A local Vite application that turns Pokémon Showdown team exports into
copyable pixel-art PNG panels for Gen 3 ADV.

## DISCLAIMER

Despite myself being a software engineer, this website is pure AI slop as a means to an end of dynamically generating these templates of the pixel art that I did by hand.

## Run it

```sh
npm install
npm run dev
```

Paste a Showdown export, choose a template and native/2×/3×/4×/6×/8×/10×
output, then generate. Each result has Copy PNG and Download actions. The
default 10× size is intended for presentation software that resamples images.

## Project shape

- `@pkmn/sets` is the only team parser.
- `@pkmn/dex` supplies canonical Gen 3 names and validation.
- `@pkmn/data` calculates the displayed Gen 3 stats.
- `@pkmn/img` supplies sprite and icon paths or sheet offsets.
- Bulbagarden Archives supplies the two-frame Gen III–V menu sprites used to
  generate static-menu PNG and animated GIF assets.
- PixiJS composites the native-resolution PNG.
- `src/render/template.ts` contains the integer layout coordinates and bitmap
  font glyph bounds for the artwork in `public/assets/ui`.

The app never hotlinks image resources at runtime. Run `npm run assets:mirror`
to refresh the pinned local Showdown-derived sprites and sheets used by the
current dependency versions and the Gen III menu-sprite APNGs mirrored from
Bulbagarden Archives.

## Templates and artwork

The current templates use the PNGs under `public/assets/ui`, including:

- `public/assets/ui/pokemon-overview.png`
- `public/assets/ui/stat-preview.png`
- `public/assets/ui/team-preview.png`
- `public/assets/ui/pokemon-name.png`
- `public/assets/ui/generic-text.png`
- `public/assets/ui/pokemon-spotlight.png`
- `public/assets/ui/pokemon-spotlight-small.png`
- `public/assets/ui/font-small.png`
- `public/assets/ui/font-large.png`

Move-related artwork is retained for the next generator milestone.

To adjust a field, edit its slot in `src/render/template.ts`. Parsing, Gen 3
lookups, stat calculation, exporting, and clipboard behavior do not depend on
those coordinates. Additional layouts should be registered in `TEMPLATES` and
reuse `PanelRenderer` and the Showdown asset adapter.

## Checks

```sh
npm test
npm run build
```

See `THIRD_PARTY_NOTICES.md` for dependency and artwork notices.
