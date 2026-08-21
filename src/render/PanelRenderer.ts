import { Generations } from "@pkmn/data";
import { Dex } from "@pkmn/dex";
import type { PokemonSet } from "@pkmn/sets";
import {
  Application,
  Assets,
  Container,
  Graphics,
  Rectangle,
  RenderTexture,
  Sprite,
  Texture,
} from "pixi.js";

import { showdownAssets } from "../showdown/assets";
import { ADV_DEX } from "../showdown/team";
import { BitmapFontRenderer } from "./BitmapFontRenderer";
import { showdownStatBarScale } from "./statBarScale";
import { POKEMON_PANEL_TEMPLATE, SMALL_FONT, TEMPLATES } from "./template";
import type {
  AssetSource,
  RenderedPanel,
  RenderOptions,
  StatId,
  TemplateDefinition,
  TextSlot,
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

function normalizedPanelText(value: string): string {
  return value.replace(/[-'’:]/g, " ");
}

function createStatBar(
  value: number,
  stat: StatId,
  level: number,
  slot: TemplateDefinition["statBars"][StatId],
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

    const stage = await this.createPanel(set, template);
    const target = RenderTexture.create({
      width: template.width,
      height: template.height,
      resolution: 1,
    });
    this.app.renderer.render({ container: stage, target, clear: true });

    const extracted = this.app.renderer.extract.canvas(target);
    const canvas = document.createElement("canvas");
    canvas.width = template.width * options.scale;
    canvas.height = template.height * options.scale;
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
    const species = ADV_DEX.species.get(set.species ?? "");
    const scaleSuffix = options.scale === 1 ? "" : `-${options.scale}x`;
    const filename = `${String(sourceSetIndex + 1).padStart(2, "0")}-${species.id}${scaleSuffix}.png`;

    stage.destroy({ children: true });
    target.destroy(true);

    return {
      sourceSetIndex,
      set,
      speciesId: species.id,
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
    template: TemplateDefinition,
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
    const displayName = normalizedPanelText(
      set.name || species?.name || set.species || "",
    );
    stage.addChild(
      await this.font.create(
        genderSymbol ? `${displayName} ${genderSymbol}` : displayName,
        template.text.name,
      ),
    );

    stage.addChild(
      await this.font.create(String(set.level ?? 100), template.text.level),
    );
    stage.addChild(
      await this.font.create(
        normalizedPanelText(set.ability || "NO ABILITY"),
        template.text.ability,
      ),
    );
    stage.addChild(
      await this.font.create(
        normalizedPanelText(set.item || "NO ITEM"),
        template.text.item,
      ),
    );

    for (let index = 0; index < template.moveRows.length; index += 1) {
      const move = set.moves?.[index];
      if (!move) continue;
      stage.addChild(
        await this.font.create(
          normalizedPanelText(move),
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
