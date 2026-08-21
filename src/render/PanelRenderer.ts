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
  pokemonOverviewMoveText,
  rightAlignedMoveStats,
  smallFontText,
} from "./moveText";
import { showdownStatBarScale } from "./statBarScale";
import { encodeAnimatedGif } from "./gifEncoder";
import {
  bottomCenterBounds,
  loadMenuSpriteFrames,
  loadSpriteAnimation,
  resolveAnimationFrameIndex,
  type AnimationFrameSelection,
} from "./menuSpriteFrames";
import {
  GENERIC_TEXT_TEMPLATE,
  MOVE_OVERVIEW_TEMPLATE,
  POKEMON_NAME_FONT,
  POKEMON_PANEL_TEMPLATE,
  SMALL_FONT,
  TITLE_FONT,
  TITLE_TEMPLATE,
  TEMPLATES,
} from "./template";
import type {
  AssetSource,
  RenderedPanel,
  RenderOptions,
  RenderScale,
  StatBarSlot,
  StatId,
  StatPreviewTemplateDefinition,
  TeamPreviewTemplateDefinition,
  TextSlot,
  DynamicLabelTemplateDefinition,
  GenericTextTemplateDefinition,
  PokemonOverviewTemplateDefinition,
  PokemonNameTemplateDefinition,
  PokemonSpotlightSmallTemplateDefinition,
  PokemonSpotlightTemplateDefinition,
  MoveOverviewTemplateDefinition,
  Point,
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
  private readonly compactLargeFont = new BitmapFontRenderer(POKEMON_NAME_FONT);
  private readonly titleFont = new BitmapFontRenderer(TITLE_FONT);
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
    if (template.kind === "title") {
      throw new Error("Custom titles must be rendered from title text.");
    }
    if (template.kind === "generic-text") {
      throw new Error("Generic text must be rendered from standalone text.");
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
      const species = ADV_DEX.species.get(set.species ?? "");
      const metadata = {
        sourceSetIndex,
        set,
        speciesId: species.id,
        label: set.name || species.name || set.species || "Unknown Pokémon",
        filenameStem: `${String(sourceSetIndex + 1).padStart(2, "0")}-${species.id}-spotlight`,
      };
      if (options.battleSpriteOutput !== "static") {
        return this.renderAnimatedBattlePanel(
          set,
          template,
          options,
          metadata,
          (frame) => this.createPokemonSpotlight(set, template, frame),
        );
      }
      const stage = await this.createPokemonSpotlight(set, template, "last");
      return this.exportPanel(stage, template, options.scale, metadata);
    }

    if (template.kind === "pokemon-spotlight-small") {
      const species = ADV_DEX.species.get(set.species ?? "");
      const metadata = {
        sourceSetIndex,
        set,
        speciesId: species.id,
        label: set.name || species.name || set.species || "Unknown Pokémon",
        filenameStem: `${String(sourceSetIndex + 1).padStart(2, "0")}-${species.id}-spotlight-small`,
      };
      if (options.menuSpriteOutput === "gif") {
        const animation = await loadMenuSpriteFrames(
          showdownAssets.pokemonMenuSprite(set.species ?? "").url,
        );
        const stages = await Promise.all(
          [0, 1].map((frame) =>
            this.createPokemonSpotlightSmall(set, template, frame),
          ),
        );
        return this.exportAnimatedPanel(
          stages,
          template,
          options.scale,
          metadata,
          animation.delays,
        );
      }
      const stage = await this.createPokemonSpotlightSmall(set, template, 0);
      return this.exportPanel(stage, template, options.scale, {
        ...metadata,
      });
    }

    const species = ADV_DEX.species.get(set.species ?? "");
    const templateSuffix = template.filenameSuffix
      ? `-${template.filenameSuffix}`
      : "";
    const metadata = {
      sourceSetIndex,
      set,
      speciesId: species.id,
      label: set.name || species.name || set.species || "Unknown Pokémon",
      filenameStem: `${String(sourceSetIndex + 1).padStart(2, "0")}-${species.id}${templateSuffix}`,
    };
    if (
      template.kind === "pokemon-overview" &&
      options.battleSpriteOutput !== "static"
    ) {
      return this.renderAnimatedBattlePanel(
        set,
        template,
        options,
        metadata,
        (frame) => this.createPokemonOverview(set, template, frame),
      );
    }
    const stage = await this.createPanel(
      set,
      template,
      template.kind === "pokemon-overview" ? "last" : undefined,
    );
    return this.exportPanel(stage, template, options.scale, metadata);
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
    const metadata = {
      sourceSetIndex: 0,
      set: sets[0] ?? {},
      speciesId: "team",
      label: displayName,
      filenameStem: `${filenameName}-team-preview`,
    };
    if (options.menuSpriteOutput === "gif") {
      const animations = await Promise.all(
        sets.map((set) =>
          loadMenuSpriteFrames(
            showdownAssets.pokemonMenuSprite(set.species ?? "").url,
          ),
        ),
      );
      const delay = animations.length
        ? Math.max(...animations.map((animation) => animation.delays[0] ?? 170))
        : 170;
      const stages = await Promise.all(
        [0, 1].map((frame) =>
          this.createTeamPreview(sets, displayName, template, frame),
        ),
      );
      return this.exportAnimatedPanel(
        stages,
        template,
        options.scale,
        metadata,
        [delay, delay],
      );
    }
    const stage = await this.createTeamPreview(sets, displayName, template, 0);
    return this.exportPanel(stage, template, options.scale, metadata);
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

  async renderTitle(
    title: string,
    options: Omit<RenderOptions, "templateId">,
  ): Promise<RenderedPanel> {
    await this.init();
    if (TITLE_TEMPLATE.kind !== "title") {
      throw new Error("The custom title template is unavailable.");
    }

    const displayTitle = title.trim() || "UNTITLED";
    const filenameTitle =
      displayTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "untitled";
    const label = await this.createDynamicLabel(
      displayTitle,
      TITLE_TEMPLATE,
      this.titleFont,
    );
    return this.exportPanel(
      label.stage,
      { width: label.width, height: TITLE_TEMPLATE.height },
      options.scale,
      {
        sourceSetIndex: 0,
        set: {},
        speciesId: "title",
        label: displayTitle,
        filenameStem: `${filenameTitle}-title`,
      },
    );
  }

  async renderGenericText(
    text: string,
    requestedWidth: number | "auto",
    options: Omit<RenderOptions, "templateId">,
  ): Promise<RenderedPanel> {
    await this.init();
    if (GENERIC_TEXT_TEMPLATE.kind !== "generic-text") {
      throw new Error("The generic text template is unavailable.");
    }

    const displayText =
      text
        .trim()
        .split(/\r?\n/)
        .map((line) => smallFontText(line))
        .join("\n") || "NO TEXT";
    const autoWidth = requestedWidth === "auto";
    const panelInset =
      2 * (GENERIC_TEXT_TEMPLATE.borderSize + GENERIC_TEXT_TEMPLATE.padding);
    const measuredWidth = Math.max(
      ...displayText.split("\n").map((line) => this.font.measure(line)),
    );
    const width = autoWidth
      ? Math.max(GENERIC_TEXT_TEMPLATE.minWidth, measuredWidth + panelInset)
      : Math.min(
          GENERIC_TEXT_TEMPLATE.maxWidth,
          Math.max(GENERIC_TEXT_TEMPLATE.minWidth, Math.round(requestedWidth)),
        );
    if (width > GENERIC_TEXT_TEMPLATE.maxWidth) {
      throw new Error(
        `The longest line exceeds the ${GENERIC_TEXT_TEMPLATE.maxWidth}px auto-width limit.`,
      );
    }
    const panel = await this.createGenericText(
      displayText,
      width,
      GENERIC_TEXT_TEMPLATE,
      autoWidth,
    );
    const filenameText =
      displayText
        .slice(0, 40)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "generic-text";

    return this.exportPanel(
      panel.stage,
      { width, height: panel.height },
      options.scale,
      {
        sourceSetIndex: 0,
        set: {},
        speciesId: "generic-text",
        label: displayText.replace(/\n/g, " "),
        filenameStem: `${filenameText}-text`,
      },
    );
  }

  private async exportPanel(
    stage: Container,
    dimensions: { width: number; height: number },
    scale: RenderScale,
    metadata: Pick<
      RenderedPanel,
      "sourceSetIndex" | "set" | "speciesId" | "label"
    > & { filenameStem: string },
  ): Promise<RenderedPanel> {
    const canvas = this.renderStageToCanvas(stage, dimensions, scale);

    const blob = await canvasToBlob(canvas);
    const scaleSuffix = scale === 1 ? "" : `-${scale}x`;
    const filename = `${metadata.filenameStem}${scaleSuffix}.png`;

    stage.destroy({ children: true });
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
      format: "PNG",
    };
  }

  private exportAnimatedPanel(
    stages: Container[],
    dimensions: { width: number; height: number },
    scale: RenderScale,
    metadata: Pick<
      RenderedPanel,
      "sourceSetIndex" | "set" | "speciesId" | "label"
    > & { filenameStem: string },
    delays: number[],
    animationOptions: {
      repeat: "once" | "forever";
      loopPauseMs?: number;
    } = { repeat: "forever" },
  ): RenderedPanel {
    const canvases = stages.map((stage) =>
      this.renderStageToCanvas(stage, dimensions, 1),
    );
    const blob = encodeAnimatedGif(canvases, delays, {
      ...animationOptions,
      scale,
    });
    const scaleSuffix = scale === 1 ? "" : `-${scale}x`;

    for (const stage of stages) stage.destroy({ children: true });

    return {
      sourceSetIndex: metadata.sourceSetIndex,
      set: metadata.set,
      speciesId: metadata.speciesId,
      label: metadata.label,
      width: canvases[0].width * scale,
      height: canvases[0].height * scale,
      blob,
      previewUrl: URL.createObjectURL(blob),
      filename: `${metadata.filenameStem}${scaleSuffix}.gif`,
      format: "GIF",
    };
  }

  private async renderAnimatedBattlePanel(
    set: Partial<PokemonSet>,
    dimensions: { width: number; height: number },
    options: RenderOptions,
    metadata: Pick<
      RenderedPanel,
      "sourceSetIndex" | "set" | "speciesId" | "label"
    > & { filenameStem: string },
    createStage: (frame: number) => Promise<Container>,
  ): Promise<RenderedPanel> {
    const asset = showdownAssets.pokemonEmeraldSprite(set.species ?? "", {
      shiny: set.shiny,
    });
    if (!asset) {
      throw new Error("This form does not have an enabled Emerald animation.");
    }
    const animation = await loadSpriteAnimation(asset.url);
    const stages = await Promise.all(
      animation.frames.map((_, frame) => createStage(frame)),
    );
    const animatedScale = options.scale;
    const looping = options.battleSpriteOutput === "loop";
    const pauseSuffix = `${(options.battleAnimationLoopPauseMs / 1000)
      .toFixed(1)
      .replace(".", "_")}s`;
    return this.exportAnimatedPanel(
      stages,
      dimensions,
      animatedScale,
      {
        ...metadata,
        filenameStem: `${metadata.filenameStem}-${looping ? `loop-${pauseSuffix}` : "once"}`,
      },
      animation.delays,
      {
        repeat: looping ? "forever" : "once",
        loopPauseMs: looping ? options.battleAnimationLoopPauseMs : 0,
      },
    );
  }

  private renderStageToCanvas(
    stage: Container,
    dimensions: { width: number; height: number },
    scale: RenderScale,
  ): HTMLCanvasElement {
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
    target.destroy(true);
    return canvas;
  }

  destroy(): void {
    if (!this.initialized) return;
    this.app.destroy(true);
    this.initialized = false;
  }

  private async createPanel(
    set: Partial<PokemonSet>,
    template: PokemonOverviewTemplateDefinition | StatPreviewTemplateDefinition,
    battleFrame?: AnimationFrameSelection,
  ): Promise<Container> {
    if (template.kind === "stat-preview") {
      return this.createStatPreview(set, template);
    }
    return this.createPokemonOverview(set, template, battleFrame);
  }

  private async createTeamPreview(
    sets: Partial<PokemonSet>[],
    teamName: string,
    template: TeamPreviewTemplateDefinition,
    frame: number,
  ): Promise<Container> {
    const stage = new Container();
    if (template.background) {
      stage.addChild(await this.createAssetSprite(template.background));
    }

    stage.addChild(
      await this.compactLargeFont.create(
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
      const icon = await this.createMenuSprite(
        showdownAssets.pokemonMenuSprite(set.species ?? ""),
        frame,
        template.iconSlots[index],
      );
      stage.addChild(icon);
    }

    return stage;
  }

  private async createPokemonName(
    set: Partial<PokemonSet>,
    template: PokemonNameTemplateDefinition,
  ): Promise<{ stage: Container; width: number }> {
    const species = ADV.species.get(set.species ?? "");
    const displayName = normalizedLargeText(
      set.name || species?.name || set.species || "UNKNOWN",
    );
    return this.createDynamicLabel(displayName, template);
  }

  private async createDynamicLabel(
    displayText: string,
    template: DynamicLabelTemplateDefinition,
    font = this.compactLargeFont,
  ): Promise<{ stage: Container; width: number }> {
    const stage = new Container();
    const textWidth = font.measure(displayText);
    const width = Math.max(
      template.minWidth,
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
      await font.create(displayText, {
        x: template.capWidth + template.paddingX,
        y: template.textY,
        maxWidth: textWidth,
        size: 16,
        color: 0xffffff,
      }),
    );

    return { stage, width };
  }

  private async createGenericText(
    displayText: string,
    width: number,
    template: GenericTextTemplateDefinition,
    preserveLineBreaks = false,
  ): Promise<{ stage: Container; height: number }> {
    const stage = new Container();
    const textWidth = width - 2 * (template.borderSize + template.padding);
    const lines = preserveLineBreaks
      ? displayText.split("\n")
      : this.font.wrap(displayText, textWidth);
    const height =
      template.borderSize * 2 +
      template.padding * 2 +
      template.glyphHeight +
      Math.max(0, lines.length - 1) * template.lineHeight;

    const texture = await Assets.load<Texture>(template.background.url);
    texture.source.scaleMode = "nearest";
    const background = new NineSliceSprite({
      texture,
      leftWidth: template.borderSize,
      rightWidth: template.borderSize,
      topHeight: template.borderSize,
      bottomHeight: template.borderSize,
    });
    background.width = width;
    background.height = height;
    stage.addChild(background);

    for (const [lineIndex, line] of lines.entries()) {
      stage.addChild(
        await this.font.create(line, {
          x: template.borderSize + template.padding,
          y: template.textOffsetY + lineIndex * template.lineHeight,
          maxWidth: textWidth,
          size: 8,
          color: 0xffffff,
        }),
      );
    }

    return { stage, height };
  }

  private async createPokemonSpotlight(
    set: Partial<PokemonSet>,
    template: PokemonSpotlightTemplateDefinition,
    battleFrame?: AnimationFrameSelection,
  ): Promise<Container> {
    const stage = new Container();
    if (template.background) {
      stage.addChild(await this.createAssetSprite(template.background));
    }

    const sprite = await this.createBattleSprite(
      set,
      battleFrame,
      template.spriteMask,
      template.animatedSpriteOffset,
    );
    const staticAnimationTopPadding =
      battleFrame === "last"
        ? Math.max(0, -template.animatedSpriteOffset.y)
        : 0;
    const mask = new Graphics()
      .rect(
        template.spriteMask.x,
        template.spriteMask.y - staticAnimationTopPadding,
        template.spriteMask.width,
        template.spriteMask.height + staticAnimationTopPadding,
      )
      .fill(0xffffff);
    if (battleFrame === undefined || battleFrame === "last") {
      sprite.mask = mask;
      stage.addChild(mask, sprite);
    } else {
      mask.destroy();
      stage.addChild(sprite);
    }

    return stage;
  }

  private async createPokemonSpotlightSmall(
    set: Partial<PokemonSet>,
    template: PokemonSpotlightSmallTemplateDefinition,
    frame: number,
  ): Promise<Container> {
    const stage = new Container();
    if (template.background) {
      stage.addChild(await this.createAssetSprite(template.background));
    }

    const icon = await this.createMenuSprite(
      showdownAssets.pokemonMenuSprite(set.species ?? ""),
      frame,
      template.icon,
    );
    stage.addChild(icon);

    return stage;
  }

  private async createPokemonOverview(
    set: Partial<PokemonSet>,
    template: PokemonOverviewTemplateDefinition,
    battleFrame?: AnimationFrameSelection,
  ): Promise<Container> {
    const stage = new Container();

    if (template.background) {
      const background = await this.createAssetSprite(template.background);
      stage.addChild(background);
    }

    const sprite = await this.createBattleSprite(
      set,
      battleFrame,
      template.spriteMask,
      template.animatedSpriteOffset,
    );
    const staticAnimationTopPadding =
      battleFrame === "last"
        ? Math.max(0, -template.animatedSpriteOffset.y)
        : 0;
    const mask = new Graphics()
      .rect(
        template.spriteMask.x,
        template.spriteMask.y - staticAnimationTopPadding,
        template.spriteMask.width,
        template.spriteMask.height + staticAnimationTopPadding,
      )
      .fill(0xffffff);
    if (battleFrame === undefined || battleFrame === "last") {
      sprite.mask = mask;
      stage.addChild(mask, sprite);
    } else {
      mask.destroy();
      stage.addChild(sprite);
    }

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
          smallFontText(pokemonOverviewMoveText(move)),
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
      await this.compactLargeFont.create(
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

  private async createMenuSprite(
    asset: AssetSource,
    frameIndex: number,
    slot: Point,
  ): Promise<Sprite> {
    const animation = await loadMenuSpriteFrames(asset.url);
    const frame = animation.frames[frameIndex % animation.frames.length];
    const texture = Texture.from(frame);
    texture.source.scaleMode = "nearest";
    const sprite = new Sprite(texture);
    sprite.x =
      slot.x +
      Math.round((frame.width - animation.bounds.width) / 2) -
      animation.bounds.x;
    sprite.y =
      slot.y + frame.height - (animation.bounds.y + animation.bounds.height);
    return sprite;
  }

  private async createBattleSprite(
    set: Partial<PokemonSet>,
    frameIndex: AnimationFrameSelection | undefined,
    mask: { x: number; y: number; width: number; height: number },
    animatedOffset: Point,
  ): Promise<Sprite> {
    const emeraldAsset = showdownAssets.pokemonEmeraldSprite(
      set.species ?? "",
      { shiny: set.shiny },
    );
    if (frameIndex !== undefined && emeraldAsset) {
      const animation = await loadSpriteAnimation(emeraldAsset.url);
      const resolvedFrameIndex = resolveAnimationFrameIndex(
        frameIndex,
        animation.frames.length,
      );
      const frame = animation.frames[resolvedFrameIndex];
      const texture = Texture.from(frame);
      texture.source.scaleMode = "nearest";
      const sprite = new Sprite(texture);
      const position = bottomCenterBounds(
        animation.restingBounds,
        mask,
        animatedOffset,
      );
      sprite.x = position.x;
      sprite.y = position.y;
      return sprite;
    }

    throw new Error(
      `No Emerald battle sprite is available for ${set.species ?? "this Pokémon"}.`,
    );
  }
}
