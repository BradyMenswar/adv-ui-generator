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
  scope: "pokemon" | "move" | "team";
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
              <label for="scale-select">PNG size</label>
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
    this.scaleSelect.addEventListener("change", () => {
      if (this.validSetIndexes.length) void this.renderAssets();
    });
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
        return { scale: scaleValue };
      default:
        return { scale: 1 };
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
      this.clearPanels();
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
    this.clearPanels();
    this.results.innerHTML = `<div class="rendering-state">Rendering ${escapeHtml(displayName(selectedSet))}…</div>`;

    const renderIssues: TeamIssue[] = [];
    try {
      for (const template of TEMPLATES.values()) {
        if (
          template.kind === "team-preview" ||
          template.kind === "move-overview"
        )
          continue;
        try {
          const panel = await this.renderer.render(
            selectedSet,
            this.selectedSetIndex,
            { ...this.renderOptions, templateId: template.id },
          );
          this.renderedEntries.push({
            panel,
            title: template.label,
            templateId: template.id,
            scope: "pokemon",
          });
        } catch (error) {
          renderIssues.push({
            setIndex: this.selectedSetIndex,
            message: `${template.label}: ${error instanceof Error ? error.message : "Rendering failed."}`,
          });
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

      try {
        const validSets = this.validSetIndexes.map(
          (index) => this.parsedSets[index],
        );
        const panel = await this.renderer.renderTeam(
          validSets,
          this.teamNameInput.value,
          { ...this.renderOptions, templateId: TEAM_PREVIEW_TEMPLATE.id },
        );
        this.renderedEntries.push({
          panel,
          title: TEAM_PREVIEW_TEMPLATE.label,
          templateId: TEAM_PREVIEW_TEMPLATE.id,
          scope: "team",
        });
      } catch (error) {
        renderIssues.push({
          message: `Team preview: ${error instanceof Error ? error.message : "Rendering failed."}`,
        });
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

    if (!this.renderedEntries.length) {
      count.textContent = "No assets generated";
      this.results.innerHTML = `<div class="empty-state"><p>No valid Gen 3 sets are ready to render.</p></div>`;
      return;
    }

    count.textContent = `${pokemonEntries.length} Pokémon assets · ${moveEntries.length} move assets${teamEntries.length ? ` · ${teamEntries.length} team asset` : ""}`;
    const selectedName = displayName(this.parsedSets[this.selectedSetIndex]);
    this.results.innerHTML = `
      <section class="asset-group" aria-labelledby="pokemon-assets-heading">
        <div class="asset-group-heading">
          <h3 id="pokemon-assets-heading">${escapeHtml(selectedName)}</h3>
          <span>All Pokémon assets</span>
        </div>
        <div class="asset-grid">
          ${pokemonEntries.map((entry) => this.renderEntry(entry)).join("")}
        </div>
      </section>
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
                <h3 id="team-assets-heading">Team asset</h3>
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
        <span>${panel.width}×${panel.height} PNG</span>
      </div>
      <div class="preview-stage">
        <img src="${panel.previewUrl}" alt="${escapeHtml(entry.title)} for ${escapeHtml(panel.label)}" width="${panel.width}" height="${panel.height}">
      </div>
      <div class="result-actions">
        <button type="button" data-copy="${index}">Copy PNG</button>
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
        new ClipboardItem({ "image/png": panel.blob }),
      ]);
      status.textContent = "Copied";
    } catch {
      status.textContent = "Copy was blocked—use Download.";
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

  private destroy(): void {
    this.clearPanels();
    this.renderer.destroy();
  }
}
