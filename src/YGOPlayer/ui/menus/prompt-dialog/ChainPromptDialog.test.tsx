import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ChainPromptDialog } from "./ChainPromptDialog";
import type { OptionRow } from "../../assist-sections";

const duel: any = { ygo: { state: { getCardData: (code: number) => ({ name: `Card ${code}`, images: { small_url: `/img/${code}.jpg` } }) } } };
const row = (code: number, loc: number, extra: Partial<OptionRow> = {}): OptionRow => ({
  key: `Activate:${code}:0:${loc}`, label: `Card ${code}`, commandType: "Activate", data: { id: code, ctrl: 0, loc, seq: 0 },
  code, count: 1, highlight: true, tone: "quick", ...extra,
});
const pass: OptionRow = { key: "pass", label: "Don't respond", commandType: "Pass", data: {}, count: 1, highlight: false };

function render(rows: OptionRow[], props: Partial<Parameters<typeof ChainPromptDialog>[0]> = {}) {
  return renderToStaticMarkup(
    <ChainPromptDialog duel={duel} title="Respond to X" rows={rows} chainLength={1} respondingTo="Beatrice" busy={false} pendingKey={null}
      choose={vi.fn()} onHover={vi.fn()} {...props} />,
  );
}

describe("ChainPromptDialog", () => {
  it("asks Master Duel's question with the card name highlighted", () => {
    const html = render([row(1, 0x02), pass]);
    expect(html).toContain('<span>The effect of </span><span class="ygo-md-prompt-keyword">&quot;Beatrice&quot;</span><span> is activated.');
    expect(html).toContain('role="dialog"');
    expect(html).toContain("ygo-assist-prompt-dialog");
  });

  it("groups the chainable cards by location, field first", () => {
    const html = render([row(1, 0x02), row(2, 0x08), row(3, 0x02, { count: 2 }), pass]);
    const groups = [...html.matchAll(/aria-label="(Field|Hand|GY)"/g)].map((m) => m[1]);
    expect(groups).toEqual(["Field", "Hand"]);
    expect([...html.matchAll(/src="\/img\/(\d+)\.jpg"/g)].map((m) => m[1])).toEqual(["2", "1", "3"]);
    expect(html).toContain("×2");
  });

  it("has Cancel (the pass row) and a disabled Effect Activation until a card is picked", () => {
    const html = render([row(1, 0x02), row(2, 0x02), pass]);
    expect(html).toMatch(/is-secondary"[^>]*title="Don&#x27;t respond"|title="Don&#x27;t respond"[^>]*is-secondary/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*class="ygo-md-prompt-button is-primary"[^>]*>.*Effect Activation/);
  });

  it("a single card to chain starts picked: Effect Activation is enabled", () => {
    const html = render([row(1, 0x02), pass]);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*class="ygo-md-prompt-button is-primary"[^>]*>.*Effect Activation/);
    expect(html).toMatch(/Effect Activation/);
  });

  it("has no Cancel when the chain can't be passed", () => {
    expect(render([row(1, 0x02)])).not.toContain(">Cancel");
  });

  it("shows the coach's tips per card, and says when there's nothing to quote", () => {
    const coach = { tagsFor: (r: OptionRow) => (r.code === 1 ? ["they won 41% when Card 1 answered Beatrice (230 games)", "denies them 1 card"] : []), keyNote: null, answering: true };
    const html = render([row(1, 0x02), row(2, 0x02), pass], { coach });
    expect(html).toContain("Coach");
    expect(html).toContain("<strong>Card 1</strong>: they won 41% when Card 1 answered Beatrice (230 games) · denies them 1 card");
    expect(html).not.toContain("<strong>Card 2</strong>");
    const empty = render([row(2, 0x02), pass], { coach: { ...coach, tagsFor: () => [] } });
    expect(empty).toContain("No replay stats for answering Beatrice yet.");
    expect(render([row(1, 0x02), pass])).not.toContain("ygo-md-coach-tips");
  });
});
