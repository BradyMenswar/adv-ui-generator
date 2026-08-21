# ADV Image Generator

A local Vite application that turns Pokémon Showdown team exports into
copyable pixel-art PNG panels for Gen 3 ADV.

## Run it

```sh
npm install
npm run dev
```

Paste a Showdown export, choose native/2×/3× output, and generate. Each valid
set gets its own Copy PNG and Download action.

## Project shape

- `@pkmn/sets` is the only team parser.
- `@pkmn/dex` supplies canonical Gen 3 names and validation.
- `@pkmn/data` calculates the displayed Gen 3 stats.
- `@pkmn/img` supplies sprite and icon paths or sheet offsets.
- PixiJS composites the native-resolution PNG.
- `src/render/template.ts` contains the integer layout coordinates and bitmap
  font glyph bounds for the artwork in `ui-assets`.

The app never hotlinks image resources at runtime. Run `npm run assets:mirror`
to refresh the pinned local Showdown-derived sprites and sheets used by the
current dependency versions.

## Replace or calibrate the artwork

The current panel uses:

- `public/assets/ui/pokemon-overview.png`
- `public/assets/ui/font-small.png`
- `public/assets/ui/font-large.png`

These files are served over the same HTTP origin as the app. Replace them in
place when changing the artwork.

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
