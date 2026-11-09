import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CoachPanelView, coachPanelVisible, type CoachPanelViewProps } from "./coach-panel";
import { CoachPreviewButton, CoachTags } from "./assisted-options-panel";
import type { CoachState } from "../../core/YGOCoachController";

const base: CoachState = {
  available: true, enabled: true, everEnabled: true, switching: false, stats: null,
  suggest: { status: "idle" }, preview: { status: "idle" }, error: null,
};
const noop = () => {};
const render = (state: Partial<CoachState>, props: Partial<CoachPanelViewProps> = {}) => renderToStaticMarkup(
  <CoachPanelView state={{ ...base, ...state }} turn={2} canSuggest collapsed={false} onToggleCollapsed={noop} onSetEnabled={noop} onSuggest={noop} {...props} />,
);

describe("<CoachPanel>", () => {
  it("is hidden only without a coach (off at the start still shows the switch)", () => {
    expect(coachPanelVisible({ ...base, available: false })).toBe(false);
    expect(coachPanelVisible({ ...base, enabled: false, everEnabled: false })).toBe(true);
  });

  it("off at the start: the collapsed header with the switch, no stats", () => {
    const html = render({ enabled: false, everEnabled: false, stats: { format: "TCG", deckType: { name: "Dracotail", confidence: 1 } } }, { collapsed: true });
    expect(html).toContain("Coach (off)");
    expect(html).toContain('role="switch"');
    expect(html).not.toContain("checked");
    expect(html).not.toContain("Dracotail");
    expect(html).not.toContain("Suggest my turn");
  });

  it("shows the stats and the switch", () => {
    const html = render({ stats: {
      format: "TCG", deckType: { name: "Dracotail", confidence: 0.9 }, overall: { games: 200, wins: 104 },
      matchup: null, oppHandTraps: [{ name: "Ash Blossom", chance: 0.38 }],
    } });
    expect(html).toContain("Dracotail");
    expect(html).toContain("90% match");
    expect(html).toContain("52% of 200");
    expect(html).toContain("Shows once you see a bot card.");
    expect(html).toContain("Ash Blossom");
    expect(html).toContain("38%");
    expect(html).toContain('role="switch"');
    expect(html).toContain("checked");
    expect(html).toContain("Suggest my turn");
  });

  it("shows a loading suggestion, then its steps and end board", () => {
    expect(render({ suggest: { status: "loading", turn: 2 } })).toContain("Thinking…");
    const html = render({ suggest: { status: "done", turn: 2, result: { available: true, steps: ["Activate Ketu Dracotail (hand)", "Normal Summon Dracotail Lukias"], end: { interruptions: 3, now: 1 }, ms: 4000 } } });
    expect(html).toContain("<li>Activate Ketu Dracotail (hand)</li>");
    expect(html).toContain("End board: 3 interruptions (now 1)");
  });

  it("shows why there's no suggestion, and forgets last turn's", () => {
    const busy = { status: "done" as const, turn: 2, result: { available: false as const, reason: "The coach is busy, try again in a moment" } };
    expect(render({ suggest: busy })).toContain("The coach is busy");
    expect(render({ suggest: busy }, { turn: 3 })).not.toContain("The coach is busy");
  });

  it("turned off: only the header, switch and a line", () => {
    const html = render({ enabled: false, stats: { format: "TCG" } });
    expect(html).not.toContain("Suggest my turn");
    expect(html).not.toContain("checked");
    expect(html).toContain("Turn it on");
  });

  it("collapsed: no body", () => {
    expect(render({ stats: { format: "TCG" } }, { collapsed: true })).not.toContain("Suggest my turn");
  });
});

describe("coach tags in the options panel", () => {
  it("renders each tag", () => {
    const html = renderToStaticMarkup(<CoachTags tags={["players chose this 62%", "opens Garunix"]} />);
    expect(html).toContain("players chose this 62%");
    expect(html).toContain("opens Garunix");
  });

  it("Preview button: idle, loading, then the result line", () => {
    expect(renderToStaticMarkup(<CoachPreviewButton status="idle" onPreview={noop} />)).toContain("Preview");
    expect(renderToStaticMarkup(<CoachPreviewButton status="loading" onPreview={noop} />)).toContain("Previewing…");
    const retry = renderToStaticMarkup(<CoachPreviewButton status="retry" onPreview={noop} />);
    expect(retry).toContain("Try again in a moment");
    expect(retry).not.toContain("disabled");
    expect(renderToStaticMarkup(<CoachPreviewButton status="done" onPreview={noop} />)).toContain("Coach preview");
  });
});

describe("Their turn 1 block", () => {
  it("shows clean vs interrupted, by interruptions and the top 3 choke points", () => {
    const html = render({ stats: { format: "TCG", oppAnswers: {
      deckType: "Dracotail", clean: { games: 100, wins: 61 }, interrupted: { games: 80, wins: 30 },
      byInterruptions: [{ label: "0", games: 100, wins: 61 }, { label: "1", games: 50, wins: 22 }],
      chokePoints: [1, 2, 3, 4].map((code) => ({ code, name: `Card ${code}`, games: 10, wins: 4 })),
      answers: [],
    } } });
    expect(html).toContain("Their turn 1 · Dracotail");
    expect(html).toContain("61% of 100");
    expect(html).toContain("38% of 80");
    expect(html).toContain("1 interruption");
    expect(html).toContain("Card 3");
    expect(html).not.toContain("Card 4");
    expect(html).not.toContain("stops");
  });

  it("is absent without oppAnswers", () => {
    expect(render({ stats: { format: "TCG", oppAnswers: null } })).not.toContain("Their turn 1");
  });
});

