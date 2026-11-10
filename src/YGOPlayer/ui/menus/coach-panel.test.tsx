import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CoachPanelView, coachPanelVisible, type CoachPanelViewProps } from "./coach-panel";
import { CoachPreviewButton, CoachSuggestButton, CoachTags } from "./assisted-options-panel";
import type { CoachState } from "../../core/YGOCoachController";
import { coachLines } from "./use-coach-now";
import { mergeCoachLines } from "./menu-panel/components/chat";

const base: CoachState = {
  available: true, enabled: true, everEnabled: true, switching: false, stats: null,
  suggest: { status: "idle" }, preview: { status: "idle" }, error: null, messages: [],
};
const noop = () => {};
const render = (state: Partial<CoachState>, props: Partial<CoachPanelViewProps> = {}) => renderToStaticMarkup(
  <CoachPanelView state={{ ...base, ...state }} turn={2} canSuggest onSuggest={noop} {...props} />,
);

describe("<CoachPanel>: Suggest my turn on the board", () => {
  it("shows only with the coach on, on your Main Phase 1 (the switch is in the settings)", () => {
    expect(coachPanelVisible({ ...base, available: false })).toBe(false);
    expect(coachPanelVisible({ ...base, enabled: false })).toBe(false);
    expect(coachPanelVisible(base, false)).toBe(false);
    expect(coachPanelVisible(base, true)).toBe(true);
    const html = render({ stats: { format: "TCG", deckType: { name: "Dracotail", confidence: 0.9 } } });
    expect(html).toContain("Suggest my turn");
    expect(html).not.toContain('role="switch"');
    expect(html).not.toContain("Dracotail");
  });

  it("a refused suggestion says why and can be asked again; a found line is in the chat", () => {
    const refused = render({ suggest: { status: "done", turn: 2, result: { available: false, reason: "The coach is busy, try again in a moment" } } });
    expect(refused).toContain("The coach is busy");
    expect(refused).not.toMatch(/<button[^>]*disabled[^>]*>Suggest my turn/);
    expect(render({ suggest: { status: "done", turn: 2, result: { available: false, reason: "The coach is busy" } } }, { turn: 3 })).not.toContain("The coach is busy");
    const found = render({ suggest: { status: "done", turn: 2, result: { available: true, steps: ["Normal Summon X"], end: { interruptions: 2, now: 0 }, ms: 10 } } });
    expect(found).toMatch(/<button[^>]*disabled[^>]*>Line in chat/);
    expect(render({ suggest: { status: "loading", turn: 2 } })).toContain("Thinking…");
  });

  it("a line found for an earlier board: Suggest again (the duel moved, their Ash Blossom…)", () => {
    const found = { status: "done" as const, turn: 2, mark: 40, result: { available: true as const, steps: ["Normal Summon X"], end: { interruptions: 2, now: 0 }, ms: 10 } };
    expect(render({ suggest: found }, { mark: 40 })).toMatch(/<button[^>]*disabled[^>]*>Line in chat/);
    const moved = render({ suggest: found }, { mark: 46 });
    expect(moved).toContain("Suggest my turn");
    expect(moved).not.toMatch(/<button[^>]*disabled[^>]*>Suggest my turn/);
  });
});

describe("coachLines: what the coach posts in the chat", () => {
  const turn = { turn: 2, phase: "Main Phase 1" };
  const now = { outlook: "Going second: Fire King won 41% (157 games).", held: [], tip: "~38% they hold Ash Blossom: lead with it.", responses: null };

  it("the outlook, the clear deck guess and the moment's tip, each keyed once", () => {
    const lines = coachLines(now, { format: "TCG", oppGuess: { seen: 3, types: [{ name: "Dracotail", share: 0.64 }, { name: "Branded", share: 0.36 }] } }, turn);
    expect(lines.map((l) => l.text)).toEqual([
      "Going second: Fire King won 41% (157 games).",
      "Their deck looks like Dracotail (64% from 3 cards seen).",
      "~38% they hold Ash Blossom: lead with it.",
    ]);
    expect(lines[2].key).toBe("tip:2:Main Phase 1");
    // A guess that isn't clear yet is posted as one ("might be"), keyed apart from the clear one.
    const maybe = coachLines({ ...now, outlook: null, tip: null }, { format: "TCG", oppGuess: { seen: 1, types: [{ name: "A", share: 0.5 }, { name: "B", share: 0.5 }] } }, turn);
    expect(maybe).toEqual([{ key: "guess:A:maybe", text: "Their deck might be A (50%) or B (50%), from 1 card seen." }]);
  });

  it("their activation: only with something to say", () => {
    const quiet = coachLines({ outlook: null, held: [], tip: null, responses: { target: "Lukias", keyNote: null, tips: [] } }, null, turn);
    expect(quiet).toEqual([]);
    const [line] = coachLines({ outlook: null, held: [], tip: null, responses: { target: "Lukias", keyNote: null, tips: [{ name: "Ash Blossom", lines: ["stops their search: 1 card from their Deck to their hand"] }] } }, null, turn);
    expect(line.text).toBe("They activated Lukias.\nAsh Blossom: stops their search: 1 card from their Deck to their hand");
  });
});

describe("the chat merges the coach's lines by time", () => {
  it("in order, the coach's after the chat at the same time", () => {
    const chat = [{ id: "a", at: 10 }, { id: "b", at: 30 }];
    const coach = [{ id: "c1", at: 5 }, { id: "c2", at: 20 }, { id: "c3", at: 40 }];
    expect(mergeCoachLines(chat, coach).map((m) => m.id)).toEqual(["c1", "a", "c2", "b", "c3"]);
    expect(mergeCoachLines(chat, [])).toBe(chat);
  });
});

describe("coach tags in the options panel", () => {
  it("renders each tag", () => {
    const html = renderToStaticMarkup(<CoachTags tags={["~62% pick this in similar replays", "opens Garunix"]} />);
    expect(html).toContain("~62% pick this in similar replays");
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

describe("Suggest my turn in Your Options", () => {
  const duel: any = { ygo: { duelLog: { logs: new Array(12) } }, coachController: { suggest: () => {} } };
  it("asks; a found line for this board is in the chat; a refusal says why", () => {
    expect(renderToStaticMarkup(<CoachSuggestButton duel={duel} coach={base} turn={3} />)).toContain("Suggest my turn");
    const found = { ...base, suggest: { status: "done" as const, turn: 3, mark: 12, result: { available: true as const, steps: ["x"], end: { interruptions: 1, now: 0 }, ms: 5 } } };
    expect(renderToStaticMarkup(<CoachSuggestButton duel={duel} coach={found} turn={3} />)).toMatch(/<button[^>]*disabled[^>]*>.*Line in chat/);
    const refused = { ...base, suggest: { status: "done" as const, turn: 3, mark: 12, result: { available: false as const, reason: "The coach is busy, try again in a moment" } } };
    expect(renderToStaticMarkup(<CoachSuggestButton duel={duel} coach={refused} turn={3} />)).toContain("The coach is busy");
  });
});

