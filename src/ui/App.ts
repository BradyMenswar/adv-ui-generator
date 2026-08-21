import { PanelRenderer } from "../render/PanelRenderer";
import { POKEMON_PANEL_TEMPLATE } from "../render/template";
import type { RenderedPanel, RenderOptions } from "../render/types";
import { parseAdvTeam, type TeamIssue } from "../showdown/team";

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class App {
  private readonly renderer = new PanelRenderer();
  private renderedPanels: RenderedPanel[] = [];
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
          <label for="team-input">Showdown export or packed team</label>
          <textarea id="team-input" spellcheck="false" placeholder="Paste a Pokémon Showdown team here…"></textarea>
          <div class="form-row">
            <label for="scale-select">PNG size</label>
            <select id="scale-select">
              <option value="1">Native · 399×94</option>
              <option value="2">2× · 798×188</option>
              <option value="3" selected>3× · 1197×282</option>
            </select>
            <button class="primary-button" id="generate-button" type="button">Generate panels</button>
          </div>
          <div id="messages" class="messages" aria-live="polite"></div>
          <p class="source-note">Parsing, names, stats, and image lookup follow the MIT-licensed Pokémon Showdown-compatible <code>@pkmn</code> packages.</p>
        </section>
        <section class="output-pane" aria-labelledby="output-heading">
          <div class="section-heading output-heading">
            <h2 id="output-heading">Generated panels</h2>
            <span id="result-count">No panels yet</span>
          </div>
          <div id="results" class="results">
            <div class="empty-state">
              <div class="empty-preview" aria-hidden="true"></div>
              <p>Paste a team to render one image for each Pokémon.</p>
            </div>
          </div>
        </section>
      </main>
    `;

    this.input.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void this.generate();
      }
    });
    this.root
      .querySelector("#generate-button")
      ?.addEventListener("click", () => void this.generate());
    this.root.querySelector("#sample-button")?.addEventListener("click", () => {
      this.input.value = SAMPLE_TEAM;
      this.input.focus();
    });
    window.addEventListener("beforeunload", () => this.destroy());

    this.input.value = SAMPLE_TEAM;
    void this.generate();
  }

  private get input(): HTMLTextAreaElement {
    return this.root.querySelector<HTMLTextAreaElement>("#team-input")!;
  }

  private get messages(): HTMLElement {
    return this.root.querySelector<HTMLElement>("#messages")!;
  }

  private get results(): HTMLElement {
    return this.root.querySelector<HTMLElement>("#results")!;
  }

  private async generate(): Promise<void> {
    if (this.generating) return;
    this.generating = true;
    this.setBusy(true);
    this.clearPanels();

    try {
      const parsed = parseAdvTeam(this.input.value);
      this.showIssues(parsed.issues);
      const invalidIndexes = new Set(
        parsed.issues
          .map((issue) => issue.setIndex)
          .filter((index): index is number => index !== undefined),
      );
      const scaleValue = Number(
        this.root.querySelector<HTMLSelectElement>("#scale-select")?.value,
      );
      const options: RenderOptions = {
        templateId: POKEMON_PANEL_TEMPLATE.id,
        scale: scaleValue === 2 ? 2 : scaleValue === 3 ? 3 : 1,
      };
      const renderIssues: TeamIssue[] = [];

      for (let index = 0; index < parsed.sets.length; index += 1) {
        if (invalidIndexes.has(index)) continue;
        try {
          const panel = await this.renderer.render(
            parsed.sets[index],
            index,
            options,
          );
          this.renderedPanels.push(panel);
        } catch (error) {
          renderIssues.push({
            setIndex: index,
            message:
              error instanceof Error
                ? error.message
                : "Panel rendering failed.",
          });
        }
      }
      this.showIssues([...parsed.issues, ...renderIssues]);
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
    if (!this.renderedPanels.length) {
      count.textContent = "No panels generated";
      this.results.innerHTML = `<div class="empty-state"><p>No valid Gen 3 sets are ready to render.</p></div>`;
      return;
    }

    count.textContent = `${this.renderedPanels.length} ${this.renderedPanels.length === 1 ? "panel" : "panels"}`;
    this.results.innerHTML = this.renderedPanels
      .map((panel, index) => {
        const species =
          panel.set.name || panel.set.species || "Unknown Pokémon";
        return `
          <article class="result-item">
            <div class="result-title">
              <h3>${escapeHtml(species)}</h3>
              <span>${panel.width}×${panel.height} PNG</span>
            </div>
            <div class="preview-stage">
              <img src="${panel.previewUrl}" alt="Generated panel for ${escapeHtml(species)}" width="${panel.width}" height="${panel.height}">
            </div>
            <div class="result-actions">
              <button type="button" data-copy="${index}">Copy PNG</button>
              <button type="button" data-download="${index}">Download</button>
              <span class="action-status" id="action-status-${index}" aria-live="polite"></span>
            </div>
          </article>`;
      })
      .join("");

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

  private async copyPanel(index: number): Promise<void> {
    const panel = this.renderedPanels[index];
    const status = this.root.querySelector<HTMLElement>(
      `#action-status-${index}`,
    )!;
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
    const panel = this.renderedPanels[index];
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
    button.textContent = busy ? "Rendering…" : "Generate panels";
  }

  private clearPanels(): void {
    for (const panel of this.renderedPanels)
      URL.revokeObjectURL(panel.previewUrl);
    this.renderedPanels = [];
  }

  private destroy(): void {
    this.clearPanels();
    this.renderer.destroy();
  }
}
