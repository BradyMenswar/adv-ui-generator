import type { PokemonSet } from "@pkmn/sets";

import { PanelRenderer } from "../render/PanelRenderer";
import { TEAM_PREVIEW_TEMPLATE, TEMPLATES } from "../render/template";
import type { RenderedPanel, RenderOptions } from "../render/types";
import { showdownAssets } from "../showdown/assets";
import { ADV_DEX, parseAdvTeam, type TeamIssue } from "../showdown/team";

const SAMPLE_TEAM = `Tyranitar @ Leftovers
Ability: Sand Stream
EVs: 252 HP / 64 Atk / 192 SpD
Brave Nature
- Rock Slide
- Hidden Power [Bug]
- Pursuit
- Protect

Gengar @ Leftovers
Ability: Levitate
EVs: 4 HP / 252 SpA / 252 Spe
Timid Nature
IVs: 0 Atk
- Thunderbolt
- Ice Punch
- Will-O-Wisp
- Explosion`;
const SAMPLE_TEAM_NAME = "DOUBLE SPIN";

interface RenderedEntry {
  panel: RenderedPanel;
  title: string;
  templateId: string;
  scope: "pokemon" | "move" | "team" | "title" | "generic-text";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayName(set: Partial<PokemonSet>): string {
  const species = ADV_DEX.species.get(set.species ?? "");
  return set.name || species.name || set.species || "Unknown Pokémon";
}

export class App {
  private readonly renderer = new PanelRenderer();
  private renderedEntries: RenderedEntry[] = [];
  private parsedSets: Partial<PokemonSet>[] = [];
  private validSetIndexes: number[] = [];
  private selectedSetIndex = 0;
  private parseIssues: TeamIssue[] = [];
  private generating = false;

  constructor(private readonly root: HTMLElement) {
    this.root.innerHTML = `
      <header class="app-header">
        <div class="brand-mark" aria-hidden="true">A</div>
        <div>
          <h1>ADV image generator</h1>
          <p>Pokémon Showdown team data in your pixel UI.</p>
        </div>
      </header>
      <main class="workspace">
        <section class="input-pane" aria-labelledby="paste-heading">
          <div class="section-heading">
            <h2 id="paste-heading">Team paste</h2>
            <button class="text-button" id="sample-button" type="button">Load example</button>
          </div>
          <label for="team-name">Team name</label>
          <input id="team-name" class="team-name-input" type="text" value="" maxlength="40">
          <label for="team-input">Showdown export or packed team</label>
          <textarea id="team-input" spellcheck="false" placeholder="Paste a Pokémon Showdown team here…"></textarea>
          <div class="form-row">
            <div class="option-field">
              <label for="scale-select">Output size</label>
              <select id="scale-select">
                <option value="1">Native</option>
                <option value="2">2×</option>
                <option value="3">3×</option>
                <option value="4">4×</option>
                <option value="6">6×</option>
                <option value="8">8×</option>
                <option value="10" selected>10×</option>
              </select>
            </div>
            <button class="primary-button" id="generate-button" type="button">Load team &amp; generate</button>
          </div>
          <section class="standalone-tool" aria-labelledby="custom-title-heading">
            <div>
              <h2 id="custom-title-heading">Custom title</h2>
              <p>Generate a standalone title without loading a team.</p>
            </div>
            <label for="custom-title-input">Title text</label>
            <div class="custom-title-row">
              <input id="custom-title-input" type="text" maxlength="60" placeholder="Enter a title">
              <button class="primary-button" id="generate-title-button" type="button" aria-label="Generate title">Generate</button>
            </div>
            <p class="title-message" id="title-message" aria-live="polite"></p>
          </section>
          <section class="standalone-tool" aria-labelledby="generic-text-heading">
            <div>
              <h2 id="generic-text-heading">Generic text</h2>
              <p>Wrap to a fixed width or fit the panel to the longest line.</p>
            </div>
            <label for="generic-text-input">Text</label>
            <textarea id="generic-text-input" class="generic-text-input" maxlength="1000" placeholder="Enter text; line breaks are preserved"></textarea>
            <div class="generic-text-controls">
              <div class="option-field">
                <div class="generic-text-width-heading">
                  <label for="generic-text-width">Native width</label>
                  <label class="checkbox-control" for="generic-text-auto-width">
                    <input id="generic-text-auto-width" type="checkbox">
                    <span>Auto width</span>
                  </label>
                </div>
                <input id="generic-text-width" type="number" min="32" max="399" step="1" value="94">
              </div>
              <button class="primary-button" id="generate-text-button" type="button">Generate</button>
            </div>
            <p class="title-message" id="generic-text-message" aria-live="polite"></p>
          </section>
          <div id="messages" class="messages" aria-live="polite"></div>
          <p class="source-note">Parsing, names, stats, and image lookup follow the MIT-licensed Pokémon Showdown-compatible <code>@pkmn</code> packages.</p>
        </section>
        <section class="output-pane" aria-labelledby="output-heading">
          <div class="section-heading output-heading">
            <h2 id="output-heading">Pokémon assets</h2>
            <span id="result-count">No assets yet</span>
          </div>
          <div id="member-selector" class="member-selector" aria-label="Team Pokémon"></div>
          <div id="results" class="results">
            <div class="empty-state">
              <div class="empty-preview" aria-hidden="true"></div>
              <p>Load a team, then choose a Pokémon to see all of its assets.</p>
            </div>
          </div>
        </section>
      </main>
    `;

    this.input.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void this.loadTeam();
      }
    });
    this.root
      .querySelector("#generate-button")
      ?.addEventListener("click", () => void this.loadTeam());
    this.root
      .querySelector("#generate-title-button")
      ?.addEventListener("click", () => void this.renderTitle());
    this.titleInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void this.renderTitle();
      }
    });
    this.root
      .querySelector("#generate-text-button")
      ?.addEventListener("click", () => void this.renderGenericText());
    this.genericTextInput.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void this.renderGenericText();
      }
    });
    this.genericTextAutoWidthInput.addEventListener("change", () => {
      this.genericTextWidthInput.disabled =
        this.genericTextAutoWidthInput.checked;
    });
    this.scaleSelect.addEventListener(
      "change",
      () => void this.rerenderForScale(),
    );
    this.root.querySelector("#sample-button")?.addEventListener("click", () => {
      this.input.value = SAMPLE_TEAM;
      this.teamNameInput.value = SAMPLE_TEAM_NAME;
      void this.loadTeam();
    });
    window.addEventListener("beforeunload", () => this.destroy());

    this.input.value = SAMPLE_TEAM;
    void this.loadTeam();
  }

  private get input(): HTMLTextAreaElement {
    return this.root.querySelector<HTMLTextAreaElement>("#team-input")!;
  }

  private get messages(): HTMLElement {
    return this.root.querySelector<HTMLElement>("#messages")!;
  }

  private get teamNameInput(): HTMLInputElement {
    return this.root.querySelector<HTMLInputElement>("#team-name")!;
  }

  private get results(): HTMLElement {
    return this.root.querySelector<HTMLElement>("#results")!;
  }

  private get titleInput(): HTMLInputElement {
    return this.root.querySelector<HTMLInputElement>("#custom-title-input")!;
  }

  private get titleMessage(): HTMLElement {
    return this.root.querySelector<HTMLElement>("#title-message")!;
  }

  private get genericTextInput(): HTMLTextAreaElement {
    return this.root.querySelector<HTMLTextAreaElement>("#generic-text-input")!;
  }

  private get genericTextWidthInput(): HTMLInputElement {
    return this.root.querySelector<HTMLInputElement>("#generic-text-width")!;
  }

  private get genericTextAutoWidthInput(): HTMLInputElement {
    return this.root.querySelector<HTMLInputElement>(
      "#generic-text-auto-width",
    )!;
  }

  private get genericTextMessage(): HTMLElement {
    return this.root.querySelector<HTMLElement>("#generic-text-message")!;
  }

  private get memberSelector(): HTMLElement {
    return this.root.querySelector<HTMLElement>("#member-selector")!;
  }

  private get scaleSelect(): HTMLSelectElement {
    return this.root.querySelector<HTMLSelectElement>("#scale-select")!;
  }

  private get renderOptions(): Omit<RenderOptions, "templateId"> {
    const scaleValue = Number(this.scaleSelect.value);
    switch (scaleValue) {
      case 2:
      case 3:
      case 4:
      case 6:
      case 8:
      case 10:
        return { scale: scaleValue, menuSpriteOutput: "png" };
      default:
        return { scale: 1, menuSpriteOutput: "png" };
    }
  }

  private async loadTeam(): Promise<void> {
    if (this.generating) return;

    const parsed = parseAdvTeam(this.input.value);
    const invalidIndexes = new Set(
      parsed.issues
        .map((issue) => issue.setIndex)
        .filter((index): index is number => index !== undefined),
    );
    this.parsedSets = parsed.sets;
    this.parseIssues = parsed.issues;
    this.validSetIndexes = parsed.sets
      .map((_, index) => index)
      .filter((index) => !invalidIndexes.has(index));
    this.selectedSetIndex = this.validSetIndexes[0] ?? 0;

    this.showIssues(this.parseIssues);
    this.renderMemberSelector();
    if (!this.validSetIndexes.length) {
      this.clearTeamPanels();
      this.renderResults();
      return;
    }

    await this.renderAssets();
  }

  private renderMemberSelector(): void {
    if (!this.validSetIndexes.length) {
      this.memberSelector.innerHTML = "";
      return;
    }

    this.memberSelector.innerHTML = `
      <span class="member-selector-label">Choose a Pokémon</span>
      <div class="member-list">
        ${this.validSetIndexes
          .map((setIndex) => {
            const set = this.parsedSets[setIndex];
            const selected = setIndex === this.selectedSetIndex;
            const spriteUrl = showdownAssets.pokemonSprite(set.species ?? "", {
              shiny: set.shiny,
            }).url;
            return `<button class="member-button${selected ? " is-selected" : ""}" type="button" data-set-index="${setIndex}" aria-pressed="${selected}">
              <img src="${spriteUrl}" alt="" aria-hidden="true">
              <span>${escapeHtml(displayName(set))}</span>
            </button>`;
          })
          .join("")}
      </div>`;

    this.memberSelector
      .querySelectorAll<HTMLButtonElement>("[data-set-index]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const setIndex = Number(button.dataset.setIndex);
          if (
            this.generating ||
            setIndex === this.selectedSetIndex ||
            !this.validSetIndexes.includes(setIndex)
          )
            return;
          this.selectedSetIndex = setIndex;
          this.renderMemberSelector();
          void this.renderAssets();
        });
      });
  }

  private async renderAssets(): Promise<void> {
    if (this.generating) return;
    const selectedSet = this.parsedSets[this.selectedSetIndex];
    if (!selectedSet) return;

    this.generating = true;
    this.setBusy(true);
    this.clearTeamPanels();
    this.results.innerHTML = `<div class="rendering-state">Rendering ${escapeHtml(displayName(selectedSet))}…</div>`;

    const renderIssues: TeamIssue[] = [];
    try {
      for (const template of TEMPLATES.values()) {
        if (
          template.kind === "team-preview" ||
          template.kind === "move-overview" ||
          template.kind === "title" ||
          template.kind === "generic-text"
        )
          continue;
        const outputs =
          template.kind === "pokemon-spotlight-small"
            ? (["png", "gif"] as const)
            : (["png"] as const);
        for (const menuSpriteOutput of outputs) {
          const title =
            outputs.length === 1
              ? template.label
              : `${template.label} (${menuSpriteOutput.toUpperCase()})`;
          try {
            const panel = await this.renderer.render(
              selectedSet,
              this.selectedSetIndex,
              {
                ...this.renderOptions,
                templateId: template.id,
                menuSpriteOutput,
              },
            );
            this.renderedEntries.push({
              panel,
              title,
              templateId: template.id,
              scope: "pokemon",
            });
          } catch (error) {
            renderIssues.push({
              setIndex: this.selectedSetIndex,
              message: `${title}: ${error instanceof Error ? error.message : "Rendering failed."}`,
            });
          }
        }
      }

      for (const [moveIndex, moveName] of (selectedSet.moves ?? []).entries()) {
        try {
          const panel = await this.renderer.renderMove(
            selectedSet,
            this.selectedSetIndex,
            moveName,
            moveIndex,
            this.renderOptions,
          );
          this.renderedEntries.push({
            panel,
            title: panel.label,
            templateId: "adv-move-overview",
            scope: "move",
          });
        } catch (error) {
          renderIssues.push({
            setIndex: this.selectedSetIndex,
            message: `${moveName}: ${error instanceof Error ? error.message : "Rendering failed."}`,
          });
        }
      }

      const validSets = this.validSetIndexes.map(
        (index) => this.parsedSets[index],
      );
      for (const menuSpriteOutput of ["png", "gif"] as const) {
        const title = `${TEAM_PREVIEW_TEMPLATE.label} (${menuSpriteOutput.toUpperCase()})`;
        try {
          const panel = await this.renderer.renderTeam(
            validSets,
            this.teamNameInput.value,
            {
              ...this.renderOptions,
              templateId: TEAM_PREVIEW_TEMPLATE.id,
              menuSpriteOutput,
            },
          );
          this.renderedEntries.push({
            panel,
            title,
            templateId: TEAM_PREVIEW_TEMPLATE.id,
            scope: "team",
          });
        } catch (error) {
          renderIssues.push({
            message: `${title}: ${error instanceof Error ? error.message : "Rendering failed."}`,
          });
        }
      }

      this.showIssues([...this.parseIssues, ...renderIssues]);
      this.renderResults();
    } catch (error) {
      this.messages.innerHTML = `<p class="error-message">${escapeHtml(error instanceof Error ? error.message : "Generation failed.")}</p>`;
      this.renderResults();
    } finally {
      this.generating = false;
      this.setBusy(false);
    }
  }

  private async renderTitle(): Promise<void> {
    if (this.generating) return;
    const title = this.titleInput.value.trim();
    if (!title) {
      this.titleMessage.textContent = "Enter title text to generate an asset.";
      return;
    }

    this.generating = true;
    this.setBusy(true);
    this.titleMessage.textContent = "Rendering title…";
    this.clearTitlePanels();
    try {
      const panel = await this.renderer.renderTitle(title, this.renderOptions);
      this.renderedEntries.push({
        panel,
        title: "Custom title",
        templateId: "adv-title",
        scope: "title",
      });
      this.titleMessage.textContent = "Title ready.";
      this.renderResults();
    } catch (error) {
      this.titleMessage.textContent =
        error instanceof Error ? error.message : "Title rendering failed.";
      this.renderResults();
    } finally {
      this.generating = false;
      this.setBusy(false);
    }
  }

  private async renderGenericText(): Promise<void> {
    if (this.generating) return;
    const text = this.genericTextInput.value.trim();
    const width = this.genericTextWidthInput.valueAsNumber;
    const autoWidth = this.genericTextAutoWidthInput.checked;
    if (!text) {
      this.genericTextMessage.textContent = "Enter text to generate an asset.";
      return;
    }
    if (!autoWidth && !Number.isFinite(width)) {
      this.genericTextMessage.textContent = "Enter a valid native width.";
      return;
    }

    this.generating = true;
    this.setBusy(true);
    this.genericTextMessage.textContent = "Rendering text…";
    this.clearGenericTextPanels();
    try {
      const panel = await this.renderer.renderGenericText(
        text,
        autoWidth ? "auto" : width,
        this.renderOptions,
      );
      this.renderedEntries.push({
        panel,
        title: "Generic text",
        templateId: "adv-generic-text",
        scope: "generic-text",
      });
      this.genericTextMessage.textContent = "Text panel ready.";
      this.renderResults();
    } catch (error) {
      this.genericTextMessage.textContent =
        error instanceof Error ? error.message : "Text rendering failed.";
      this.renderResults();
    } finally {
      this.generating = false;
      this.setBusy(false);
    }
  }

  private async rerenderForScale(): Promise<void> {
    if (this.generating) return;
    const hadTitle = this.renderedEntries.some(
      (entry) => entry.scope === "title",
    );
    const hadGenericText = this.renderedEntries.some(
      (entry) => entry.scope === "generic-text",
    );
    if (this.validSetIndexes.length) await this.renderAssets();
    if (hadTitle) await this.renderTitle();
    if (hadGenericText) await this.renderGenericText();
  }

  private renderResults(): void {
    const count = this.root.querySelector<HTMLElement>("#result-count")!;
    const pokemonEntries = this.renderedEntries.filter(
      (entry) => entry.scope === "pokemon",
    );
    const teamEntries = this.renderedEntries.filter(
      (entry) => entry.scope === "team",
    );
    const moveEntries = this.renderedEntries.filter(
      (entry) => entry.scope === "move",
    );
    const standaloneEntries = this.renderedEntries.filter(
      (entry) => entry.scope === "title" || entry.scope === "generic-text",
    );

    if (!this.renderedEntries.length) {
      count.textContent = "No assets generated";
      this.results.innerHTML = `<div class="empty-state"><p>No valid Gen 3 sets are ready to render.</p></div>`;
      return;
    }

    const countParts = [
      pokemonEntries.length ? `${pokemonEntries.length} Pokémon assets` : "",
      moveEntries.length ? `${moveEntries.length} move assets` : "",
      teamEntries.length
        ? `${teamEntries.length} team ${teamEntries.length === 1 ? "asset" : "assets"}`
        : "",
      standaloneEntries.length
        ? `${standaloneEntries.length} standalone ${standaloneEntries.length === 1 ? "asset" : "assets"}`
        : "",
    ].filter(Boolean);
    count.textContent = countParts.join(" · ");
    const selectedSet = this.parsedSets[this.selectedSetIndex];
    this.results.innerHTML = `
      ${
        standaloneEntries.length
          ? `<section class="asset-group" aria-labelledby="standalone-assets-heading">
              <div class="asset-group-heading">
                <h3 id="standalone-assets-heading">Standalone assets</h3>
                <span>Independent of team data</span>
              </div>
              <div class="asset-grid asset-grid--standalone">
                ${standaloneEntries.map((entry) => this.renderEntry(entry)).join("")}
              </div>
            </section>`
          : ""
      }
      ${
        pokemonEntries.length && selectedSet
          ? `<section class="asset-group" aria-labelledby="pokemon-assets-heading">
              <div class="asset-group-heading">
                <h3 id="pokemon-assets-heading">${escapeHtml(displayName(selectedSet))}</h3>
                <span>All Pokémon assets</span>
              </div>
              <div class="asset-grid">
                ${pokemonEntries.map((entry) => this.renderEntry(entry)).join("")}
              </div>
            </section>`
          : ""
      }
      ${
        moveEntries.length
          ? `<section class="asset-group" aria-labelledby="move-assets-heading">
              <div class="asset-group-heading">
                <h3 id="move-assets-heading">Move assets</h3>
                <span>One sprite per moveslot</span>
              </div>
              <div class="asset-grid">
                ${moveEntries.map((entry) => this.renderEntry(entry)).join("")}
              </div>
            </section>`
          : ""
      }
      ${
        teamEntries.length
          ? `<section class="asset-group team-asset-group" aria-labelledby="team-assets-heading">
              <div class="asset-group-heading">
                <h3 id="team-assets-heading">Team assets</h3>
                <span>Shared by the full team</span>
              </div>
              <div class="asset-grid asset-grid--team">
                ${teamEntries.map((entry) => this.renderEntry(entry)).join("")}
              </div>
            </section>`
          : ""
      }`;

    this.results
      .querySelectorAll<HTMLButtonElement>("[data-copy]")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => void this.copyPanel(Number(button.dataset.copy)),
        );
      });
    this.results
      .querySelectorAll<HTMLButtonElement>("[data-download]")
      .forEach((button) => {
        button.addEventListener("click", () =>
          this.downloadPanel(Number(button.dataset.download)),
        );
      });
  }

  private renderEntry(entry: RenderedEntry): string {
    const index = this.renderedEntries.indexOf(entry);
    const panel = entry.panel;
    const wideClass =
      entry.templateId === "adv-pokemon-panel" ||
      entry.templateId === "adv-move-overview"
        ? " result-item--wide"
        : "";
    return `<article class="result-item${wideClass}">
      <div class="result-title">
        <h4>${escapeHtml(entry.title)}</h4>
        <span>${panel.width}×${panel.height} ${panel.format}</span>
      </div>
      <div class="preview-stage">
        <img src="${panel.previewUrl}" alt="${escapeHtml(entry.title)} for ${escapeHtml(panel.label)}" width="${panel.width}" height="${panel.height}">
      </div>
      <div class="result-actions">
        <button type="button" data-copy="${index}">Copy ${panel.format}</button>
        <button type="button" data-download="${index}">Download</button>
        <span class="action-status" id="action-status-${index}" aria-live="polite"></span>
      </div>
    </article>`;
  }

  private async copyPanel(index: number): Promise<void> {
    const panel = this.renderedEntries[index]?.panel;
    const status = this.root.querySelector<HTMLElement>(
      `#action-status-${index}`,
    );
    if (!panel || !status) return;
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      status.textContent =
        "Clipboard images are unavailable here—use Download.";
      return;
    }
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ [panel.blob.type]: panel.blob }),
      ]);
      status.textContent = "Copied";
    } catch {
      status.textContent =
        panel.format === "GIF"
          ? "Animated GIF copy is unsupported here—use Download."
          : "Copy was blocked—use Download.";
    }
  }

  private downloadPanel(index: number): void {
    const panel = this.renderedEntries[index]?.panel;
    if (!panel) return;
    const link = document.createElement("a");
    link.href = panel.previewUrl;
    link.download = panel.filename;
    link.click();
  }

  private showIssues(issues: TeamIssue[]): void {
    this.messages.innerHTML = issues
      .map(
        (issue) =>
          `<p class="error-message">${issue.setIndex === undefined ? "" : `Set ${issue.setIndex + 1}: `}${escapeHtml(issue.message)}</p>`,
      )
      .join("");
  }

  private setBusy(busy: boolean): void {
    const button =
      this.root.querySelector<HTMLButtonElement>("#generate-button")!;
    button.disabled = busy;
    button.textContent = busy ? "Rendering…" : "Load team & generate";
    const titleButton = this.root.querySelector<HTMLButtonElement>(
      "#generate-title-button",
    )!;
    titleButton.disabled = busy;
    titleButton.textContent = busy ? "Rendering…" : "Generate";
    this.titleInput.disabled = busy;
    const textButton = this.root.querySelector<HTMLButtonElement>(
      "#generate-text-button",
    )!;
    textButton.disabled = busy;
    textButton.textContent = busy ? "Rendering…" : "Generate";
    this.genericTextInput.disabled = busy;
    this.genericTextAutoWidthInput.disabled = busy;
    this.genericTextWidthInput.disabled =
      busy || this.genericTextAutoWidthInput.checked;
    this.scaleSelect.disabled = busy;
    this.memberSelector
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((memberButton) => (memberButton.disabled = busy));
  }

  private clearPanels(): void {
    for (const entry of this.renderedEntries)
      URL.revokeObjectURL(entry.panel.previewUrl);
    this.renderedEntries = [];
  }

  private clearTeamPanels(): void {
    this.clearPanelsByScope(
      (scope) => scope === "pokemon" || scope === "move" || scope === "team",
    );
  }

  private clearTitlePanels(): void {
    this.clearPanelsByScope((scope) => scope === "title");
  }

  private clearGenericTextPanels(): void {
    this.clearPanelsByScope((scope) => scope === "generic-text");
  }

  private clearPanelsByScope(
    shouldClear: (scope: RenderedEntry["scope"]) => boolean,
  ): void {
    for (const entry of this.renderedEntries) {
      if (shouldClear(entry.scope)) URL.revokeObjectURL(entry.panel.previewUrl);
    }
    this.renderedEntries = this.renderedEntries.filter(
      (entry) => !shouldClear(entry.scope),
    );
  }

  private destroy(): void {
    this.clearPanels();
    this.renderer.destroy();
  }
}
