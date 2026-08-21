import { Generations } from "@pkmn/data";
import { Dex } from "@pkmn/dex";
import type { PokemonSet } from "@pkmn/sets";
import {
  Application,
  Assets,
  Container,
  Graphics,
  NineSliceSprite,
  Rectangle,
  RenderTexture,
  Sprite,
  Texture,
} from "pixi.js";

import { showdownAssets } from "../showdown/assets";
import { ADV_DEX } from "../showdown/team";
import { BitmapFontRenderer } from "./BitmapFontRenderer";
import {
  moveDescriptionText,
  maximumMovePp,
  rightAlignedMoveStats,
  smallFontText,
} from "./moveText";
import { showdownStatBarScale } from "./statBarScale";
import {
  LARGE_FONT,
  MOVE_OVERVIEW_TEMPLATE,
  POKEMON_NAME_FONT,
  POKEMON_PANEL_TEMPLATE,
  SMALL_FONT,
  TEMPLATES,
} from "./template";
import type {
  AssetSource,
  RenderedPanel,
  RenderOptions,
  StatBarSlot,
  StatId,
  StatPreviewTemplateDefinition,
  TeamPreviewTemplateDefinition,
  TextSlot,
  PokemonOverviewTemplateDefinition,
  PokemonNameTemplateDefinition,
  PokemonSpotlightSmallTemplateDefinition,
  PokemonSpotlightTemplateDefinition,
  MoveOverviewTemplateDefinition,
} from "./types";

const ADV = new Generations(Dex).get(3);
const STAT_IDS: StatId[] = ["hp", "atk", "def", "spa", "spd", "spe"];

function shiftedSlot(slot: TextSlot, x: number, y: number): TextSlot {
  return { ...slot, x, y };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The browser could not encode the panel as PNG."));
    }, "image/png");
  });
}

function normalizedLargeText(value: string): string {
  return value.replace(/[-'’:]/g, "");
}

function createStatBar(
  value: number,
  stat: StatId,
  level: number,
  slot: StatBarSlot,
): Graphics {
  const { percentage, colors } = showdownStatBarScale(value, stat, level);
  const width = Math.max(3, Math.round(slot.width * percentage));
  const insetWidth = width - 2;
  return new Graphics()
    .rect(slot.x + 1, slot.y, insetWidth, 1)
    .fill(colors.shade)
    .rect(slot.x, slot.y + 1, width, slot.height - 2)
    .fill(colors.main)
    .rect(slot.x + 1, slot.y + slot.height - 1, insetWidth, 1)
    .fill(colors.main);
}

export class PanelRenderer {
  private readonly app = new Application();
  private readonly font = new BitmapFontRenderer(SMALL_FONT);
  private readonly largeFont = new BitmapFontRenderer(LARGE_FONT);
  private readonly pokemonNameFont = new BitmapFontRenderer(POKEMON_NAME_FONT);
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.app.init({
      width: POKEMON_PANEL_TEMPLATE.width,
      height: POKEMON_PANEL_TEMPLATE.height,
      backgroundAlpha: 0,
      antialias: false,
      autoDensity: false,
      resolution: 1,
      autoStart: false,
      // Canvas avoids browser-specific WebGL framebuffer readback issues when
      // extracting the finished panel (notably transparent PNGs in Firefox).
      // It is also the natural deterministic renderer for this pixel-art UI.
      preference: "canvas",
    });
    this.initialized = true;
  }

  async render(
    set: Partial<PokemonSet>,
    sourceSetIndex: number,
    options: RenderOptions,
  ): Promise<RenderedPanel> {
    await this.init();
    const template = TEMPLATES.get(options.templateId);
    if (!template) throw new Error(`Unknown template: ${options.templateId}`);
    if (template.kind === "team-preview") {
      throw new Error("The team preview must be rendered from the whole team.");
    }
    if (template.kind === "move-overview") {
      throw new Error(
        "Move overviews must be rendered from an individual move.",
      );
    }

    if (template.kind === "pokemon-name") {
      const namePlate = await this.createPokemonName(set, template);
      const species = ADV_DEX.species.get(set.species ?? "");
      return this.exportPanel(
        namePlate.stage,
        { width: namePlate.width, height: template.height },
        options.scale,
        {
          sourceSetIndex,
          set,
          speciesId: species.id,
          label: set.name || species.name || set.species || "Unknown Pokémon",
          filenameStem: `${String(sourceSetIndex + 1).padStart(2, "0")}-${species.id}-name`,
        },
      );
    }

    if (template.kind === "pokemon-spotlight") {
      const stage = await this.createPokemonSpotlight(set, template);
      const species = ADV_DEX.species.get(set.species ?? "");
      return this.exportPanel(stage, template, options.scale, {
        sourceSetIndex,
        set,
        speciesId: species.id,
        label: set.name || species.name || set.species || "Unknown Pokémon",
        filenameStem: `${String(sourceSetIndex + 1).padStart(2, "0")}-${species.id}-spotlight`,
      });
    }

    if (template.kind === "pokemon-spotlight-small") {
      const stage = await this.createPokemonSpotlightSmall(set, template);
      const species = ADV_DEX.species.get(set.species ?? "");
      return this.exportPanel(stage, template, options.scale, {
        sourceSetIndex,
        set,
        speciesId: species.id,
        label: set.name || species.name || set.species || "Unknown Pokémon",
        filenameStem: `${String(sourceSetIndex + 1).padStart(2, "0")}-${species.id}-spotlight-small`,
      });
    }

    const stage = await this.createPanel(set, template);
    const species = ADV_DEX.species.get(set.species ?? "");
    const templateSuffix = template.filenameSuffix
      ? `-${template.filenameSuffix}`
      : "";
    return this.exportPanel(stage, template, options.scale, {
      sourceSetIndex,
      set,
      speciesId: species.id,
      label: set.name || species.name || set.species || "Unknown Pokémon",
      filenameStem: `${String(sourceSetIndex + 1).padStart(2, "0")}-${species.id}${templateSuffix}`,
    });
  }

  async renderTeam(
    sets: Partial<PokemonSet>[],
    teamName: string,
    options: RenderOptions,
  ): Promise<RenderedPanel> {
    await this.init();
    const template = TEMPLATES.get(options.templateId);
    if (!template) throw new Error(`Unknown template: ${options.templateId}`);
    if (template.kind !== "team-preview") {
      throw new Error("The selected template is not a team preview.");
    }

    const displayName = teamName.trim() || "UNTITLED TEAM";
    const filenameName =
      displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "team";
    const stage = await this.createTeamPreview(sets, displayName, template);
    return this.exportPanel(stage, template, options.scale, {
      sourceSetIndex: 0,
      set: sets[0] ?? {},
      speciesId: "team",
      label: displayName,
      filenameStem: `${filenameName}-team-preview`,
    });
  }

  async renderMove(
    set: Partial<PokemonSet>,
    sourceSetIndex: number,
    moveName: string,
    moveIndex: number,
    options: Omit<RenderOptions, "templateId">,
  ): Promise<RenderedPanel> {
    await this.init();
    if (MOVE_OVERVIEW_TEMPLATE.kind !== "move-overview") {
      throw new Error("The move overview template is unavailable.");
    }

    const move = ADV_DEX.moves.get(moveName);
    if (!move.exists) throw new Error(`Move ${moveName} was not found.`);
    const stage = await this.createMoveOverview(
      moveName,
      MOVE_OVERVIEW_TEMPLATE,
    );
    const species = ADV_DEX.species.get(set.species ?? "");
    return this.exportPanel(stage, MOVE_OVERVIEW_TEMPLATE, options.scale, {
      sourceSetIndex,
      set,
      speciesId: species.id,
      label: move.name,
      filenameStem: `${String(sourceSetIndex + 1).padStart(2, "0")}-${species.id}-move-${String(moveIndex + 1).padStart(2, "0")}-${move.id}`,
    });
  }

  private async exportPanel(
    stage: Container,
    dimensions: { width: number; height: number },
    scale: 1 | 2 | 3,
    metadata: Pick<
      RenderedPanel,
      "sourceSetIndex" | "set" | "speciesId" | "label"
    > & { filenameStem: string },
  ): Promise<RenderedPanel> {
    const target = RenderTexture.create({
      width: dimensions.width,
      height: dimensions.height,
      resolution: 1,
    });
    this.app.renderer.render({ container: stage, target, clear: true });

    const extracted = this.app.renderer.extract.canvas(target);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width * scale;
    canvas.height = dimensions.height * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas rendering is unavailable.");
    context.imageSmoothingEnabled = false;
    context.drawImage(
      extracted as CanvasImageSource,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const blob = await canvasToBlob(canvas);
    const scaleSuffix = scale === 1 ? "" : `-${scale}x`;
    const filename = `${metadata.filenameStem}${scaleSuffix}.png`;

    stage.destroy({ children: true });
    target.destroy(true);

    return {
      sourceSetIndex: metadata.sourceSetIndex,
      set: metadata.set,
      speciesId: metadata.speciesId,
      label: metadata.label,
      width: canvas.width,
      height: canvas.height,
      blob,
      previewUrl: URL.createObjectURL(blob),
      filename,
    };
  }

  destroy(): void {
    if (!this.initialized) return;
    this.app.destroy(true);
    this.initialized = false;
  }

  private async createPanel(
    set: Partial<PokemonSet>,
    template: PokemonOverviewTemplateDefinition | StatPreviewTemplateDefinition,
  ): Promise<Container> {
    if (template.kind === "stat-preview") {
      return this.createStatPreview(set, template);
    }
    return this.createPokemonOverview(set, template);
  }

  private async createTeamPreview(
    sets: Partial<PokemonSet>[],
    teamName: string,
    template: TeamPreviewTemplateDefinition,
  ): Promise<Container> {
    const stage = new Container();
    if (template.background) {
      stage.addChild(await this.createAssetSprite(template.background));
    }

    stage.addChild(
      await this.largeFont.create(
        normalizedLargeText(teamName),
        template.text.name,
      ),
    );

    for (
      let index = 0;
      index < Math.min(sets.length, template.iconSlots.length);
      index += 1
    ) {
      const set = sets[index];
      const icon = await this.createAssetSprite(
        showdownAssets.pokemonIcon(set.species ?? "", set.gender),
      );
      icon.x = template.iconSlots[index].x;
      icon.y = template.iconSlots[index].y;
      stage.addChild(icon);
    }

    return stage;
  }

  private async createPokemonName(
    set: Partial<PokemonSet>,
    template: PokemonNameTemplateDefinition,
  ): Promise<{ stage: Container; width: number }> {
    const stage = new Container();
    const species = ADV.species.get(set.species ?? "");
    const displayName = normalizedLargeText(
      set.name || species?.name || set.species || "UNKNOWN",
    );
    const textWidth = this.pokemonNameFont.measure(displayName);
    const width = Math.max(
      template.capWidth * 2,
      textWidth + template.capWidth * 2 + template.paddingX * 2,
    );

    const texture = await Assets.load<Texture>(template.background.url);
    texture.source.scaleMode = "nearest";
    const background = new NineSliceSprite({
      texture,
      leftWidth: template.capWidth,
      rightWidth: template.capWidth,
      topHeight: template.capWidth,
      bottomHeight: template.capWidth,
    });
    background.width = width;
    background.height = template.height;
    stage.addChild(background);

    stage.addChild(
      await this.pokemonNameFont.create(displayName, {
        x: template.capWidth + template.paddingX,
        y: template.textY,
        maxWidth: textWidth,
        size: 16,
        color: 0xffffff,
      }),
    );

    return { stage, width };
  }

  private async createPokemonSpotlight(
    set: Partial<PokemonSet>,
    template: PokemonSpotlightTemplateDefinition,
  ): Promise<Container> {
    const stage = new Container();
    if (template.background) {
      stage.addChild(await this.createAssetSprite(template.background));
    }

    const sprite = await this.createAssetSprite(
      showdownAssets.pokemonSprite(set.species ?? "", { shiny: set.shiny }),
    );
    sprite.x = template.sprite.x;
    sprite.y = template.sprite.y;
    const mask = new Graphics()
      .rect(
        template.spriteMask.x,
        template.spriteMask.y,
        template.spriteMask.width,
        template.spriteMask.height,
      )
      .fill(0xffffff);
    sprite.mask = mask;
    stage.addChild(mask, sprite);

    return stage;
  }

  private async createPokemonSpotlightSmall(
    set: Partial<PokemonSet>,
    template: PokemonSpotlightSmallTemplateDefinition,
  ): Promise<Container> {
    const stage = new Container();
    if (template.background) {
      stage.addChild(await this.createAssetSprite(template.background));
    }

    const icon = await this.createAssetSprite(
      showdownAssets.pokemonIcon(set.species ?? "", set.gender),
    );
    icon.x = template.icon.x;
    icon.y = template.icon.y;
    stage.addChild(icon);

    return stage;
  }

  private async createPokemonOverview(
    set: Partial<PokemonSet>,
    template: PokemonOverviewTemplateDefinition,
  ): Promise<Container> {
    const stage = new Container();

    if (template.background) {
      const background = await this.createAssetSprite(template.background);
      stage.addChild(background);
    }

    const sprite = await this.createAssetSprite(
      showdownAssets.pokemonSprite(set.species ?? "", { shiny: set.shiny }),
    );
    sprite.x = template.sprite.x;
    sprite.y = template.sprite.y;
    const mask = new Graphics()
      .rect(
        template.spriteMask.x,
        template.spriteMask.y,
        template.spriteMask.width,
        template.spriteMask.height,
      )
      .fill(0xffffff);
    sprite.mask = mask;
    stage.addChild(mask, sprite);

    if (set.item) {
      const item = await this.createAssetSprite(
        showdownAssets.itemIcon(set.item),
      );
      item.x = template.itemIcon.x;
      item.y = template.itemIcon.y;
      stage.addChild(item);
    }

    const species = ADV.species.get(set.species ?? "");
    if (species) {
      const typeSlotOffset =
        species.types.length === 1 && template.typeIcons.length > 1 ? 1 : 0;
      for (
        let index = 0;
        index <
        Math.min(
          species.types.length,
          template.typeIcons.length - typeSlotOffset,
        );
        index += 1
      ) {
        const slot = template.typeIcons[index + typeSlotOffset];
        const typeIcon = await this.createAssetSprite(
          showdownAssets.typeIcon(species.types[index]),
        );
        typeIcon.x = slot.x;
        typeIcon.y = slot.y;
        stage.addChild(typeIcon);
      }
    }

    const gender = set.gender || species?.gender;
    const genderSymbol = gender === "M" ? "♂" : gender === "F" ? "♀" : "";
    const nameMarkers = [genderSymbol, set.shiny ? "★" : ""].filter(Boolean);
    const displayName = smallFontText(
      set.name || species?.name || set.species || "",
    );
    stage.addChild(
      await this.font.create(
        nameMarkers.length
          ? `${displayName} ${nameMarkers.join(" ")}`
          : displayName,
        template.text.name,
      ),
    );

    stage.addChild(
      await this.font.create(String(set.level ?? 100), template.text.level),
    );
    stage.addChild(
      await this.font.create(
        smallFontText(set.ability || "NO ABILITY"),
        template.text.ability,
      ),
    );
    stage.addChild(
      await this.font.create(
        smallFontText(set.item || "NO ITEM"),
        template.text.item,
      ),
    );

    for (let index = 0; index < template.moveRows.length; index += 1) {
      const move = set.moves?.[index];
      if (!move) continue;
      stage.addChild(
        await this.font.create(
          smallFontText(move),
          shiftedSlot(
            template.text.move,
            template.text.move.x,
            template.moveRows[index],
          ),
        ),
      );
    }

    if (species) {
      const nature = ADV.natures.get(set.nature ?? "Serious");
      const level = set.level ?? 100;
      for (const stat of STAT_IDS) {
        const value = ADV.stats.calc(
          stat,
          species.baseStats[stat],
          set.ivs?.[stat] ?? 31,
          set.evs?.[stat] ?? 0,
          level,
          nature,
        );
        const row = template.statRows[stat];
        stage.addChild(
          createStatBar(value, stat, level, template.statBars[stat]),
        );
        const sign =
          nature?.plus === stat ? "+" : nature?.minus === stat ? "-" : "";
        stage.addChild(
          await this.font.create(
            `${value}${sign}`,
            shiftedSlot(template.text.stat, row.x, row.y),
          ),
        );
      }
    }

    return stage;
  }

  private async createMoveOverview(
    moveName: string,
    template: MoveOverviewTemplateDefinition,
  ): Promise<Container> {
    const stage = new Container();
    if (template.background) {
      stage.addChild(await this.createAssetSprite(template.background));
    }

    const move = ADV_DEX.moves.get(moveName);
    const typeIcon = await this.createAssetSprite(
      showdownAssets.typeIcon(move.type),
    );
    typeIcon.x = template.typeIcon.x;
    typeIcon.y = template.typeIcon.y;

    const categoryIcon = await this.createAssetSprite(
      showdownAssets.moveCategoryIcon(move.category),
    );
    categoryIcon.x = template.categoryIcon.x;
    categoryIcon.y = template.categoryIcon.y;

    const accuracy = move.accuracy === true ? 100 : move.accuracy;
    const accuracyText = `ACC ${accuracy}`;
    const ppText = `PP ${maximumMovePp(move.pp, move.noPPBoosts)}`;
    const powerText = move.basePower > 0 ? `POWER ${move.basePower}` : "";
    const accuracyWidth = this.font.measure(accuracyText);
    const ppWidth = this.font.measure(ppText);
    const powerWidth = this.font.measure(powerText);
    const statPositions = rightAlignedMoveStats(
      { power: powerWidth, pp: ppWidth, accuracy: accuracyWidth },
      template.statTextRight,
      template.statTextGap,
    );
    const statSlot = (left: number, width: number): TextSlot => ({
      ...template.text.stat,
      x: left,
      maxWidth: width,
    });

    stage.addChild(
      typeIcon,
      categoryIcon,
      await this.largeFont.create(
        normalizedLargeText(move.name),
        template.text.name,
      ),
      await this.font.create(
        smallFontText(moveDescriptionText(move.shortDesc, move.desc)),
        template.text.description,
      ),
      await this.font.create(
        powerText,
        statSlot(statPositions.power, powerWidth),
      ),
      await this.font.create(ppText, statSlot(statPositions.pp, ppWidth)),
      await this.font.create(
        accuracyText,
        statSlot(statPositions.accuracy, accuracyWidth),
      ),
    );

    return stage;
  }

  private async createStatPreview(
    set: Partial<PokemonSet>,
    template: StatPreviewTemplateDefinition,
  ): Promise<Container> {
    const stage = new Container();
    if (template.background) {
      stage.addChild(await this.createAssetSprite(template.background));
    }

    const species = ADV.species.get(set.species ?? "");
    if (!species) return stage;

    const nature = ADV.natures.get(set.nature ?? "Serious");
    const level = set.level ?? 100;
    const ivs = {
      hp: set.ivs?.hp ?? 31,
      atk: set.ivs?.atk ?? 31,
      def: set.ivs?.def ?? 31,
      spa: set.ivs?.spa ?? 31,
      spd: set.ivs?.spd ?? 31,
      spe: set.ivs?.spe ?? 31,
    };

    for (const stat of STAT_IDS) {
      const row = template.statRows[stat];
      const ev = set.evs?.[stat] ?? 0;
      const total = ADV.stats.calc(
        stat,
        species.baseStats[stat],
        ivs[stat],
        ev,
        level,
        nature,
      );
      const natureSign =
        nature?.plus === stat ? "+" : nature?.minus === stat ? "-" : "";

      stage.addChild(createStatBar(total, stat, level, row.bar));
      stage.addChild(
        await this.font.create(
          String(species.baseStats[stat]),
          shiftedSlot(template.text.value, row.base.x, row.base.y),
        ),
        await this.font.create(
          String(ev),
          shiftedSlot(template.text.ev, row.ev.x, row.ev.y),
        ),
        await this.font.create(
          natureSign,
          shiftedSlot(
            template.text.natureSign,
            template.text.natureSign.x,
            row.ev.y,
          ),
        ),
        await this.font.create(
          String(ivs[stat]).padStart(2, "0"),
          shiftedSlot(template.text.iv, row.iv.x, row.iv.y),
        ),
        await this.font.create(
          String(total),
          shiftedSlot(template.text.value, row.total.x, row.total.y),
        ),
      );
    }

    stage.addChild(
      await this.font.create(
        normalizedLargeText(nature?.name ?? set.nature ?? "SERIOUS"),
        template.text.nature,
      ),
    );

    const hiddenPowerIcon = await this.createAssetSprite(
      showdownAssets.typeIcon(ADV_DEX.getHiddenPower(ivs).type),
    );
    hiddenPowerIcon.x = template.hiddenPowerIcon.x;
    hiddenPowerIcon.y = template.hiddenPowerIcon.y;
    stage.addChild(hiddenPowerIcon);

    return stage;
  }

  private async createAssetSprite(asset: AssetSource): Promise<Sprite> {
    const base = await Assets.load<Texture>(asset.url);
    base.source.scaleMode = "nearest";
    if (!asset.frame) return new Sprite(base);
    const texture = new Texture({
      source: base.source,
      frame: new Rectangle(
        asset.frame.x,
        asset.frame.y,
        asset.frame.width,
        asset.frame.height,
      ),
    });
    return new Sprite(texture);
  }
}
