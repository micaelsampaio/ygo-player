import { describe, expect, it } from "vitest";
import { pileChoiceClick, pileTabs, reopenLabel, usesPilePicker } from "./pile-choice";
import { createDoubleTapDetector } from "../../../domain/double-tap";
import { doublePickAnswer, groupCandidates, toggleGroupSelection, type PromptData } from "../../../domain/assist-prompt";

const DECK = 0x01, HAND = 0x02, MZONE = 0x04, GRAVE = 0x10;
const ref = (code: number, loc: number, ctrl = 0, seq = 0) => ({ code, loc, ctrl, seq });

describe("pile choice", () => {
  it("opens for card choices from a pile, not for field- or hand-only ones", () => {
    expect(usesPilePicker({ player: 0, msg: 15, kind: "card", candidates: [ref(1, DECK)] } as any)).toBe(true);
    expect(usesPilePicker({ player: 0, msg: 15, kind: "card", candidates: [ref(1, MZONE), ref(2, HAND)] } as any)).toBe(false);
    expect(usesPilePicker({ player: 0, msg: 13, kind: "yesNo" } as any)).toBe(false);
  });

  it("groups the choices per pile, own piles first and the Deck before the GY, copies as one", () => {
    const tabs = pileTabs({ player: 0, msg: 15, kind: "card", min: 1, max: 1, candidates: [
      ref(10, GRAVE, 0, 0), ref(20, DECK, 0, 3), ref(20, DECK, 0, 7), ref(30, GRAVE, 1, 0), ref(40, DECK, 0, 9),
    ] } as any);
    expect(tabs.map((t) => [t.label, t.choices.map((c) => [c.code, c.group.indices])])).toEqual([
      ["Deck", [[20, [1, 2]], [40, [4]]]],
      ["GY", [[10, [0]]]],
      ["Opponent's GY", [[30, [3]]]],
    ]);
    expect(reopenLabel(tabs)).toBe("Choose from the list (4)");
    expect(reopenLabel(tabs.slice(0, 1))).toBe("Choose from Deck (2)");
  });
});

describe("pile choice double-click", () => {
  const prompt = (min: number, max: number) => ({
    player: 0, msg: 15, kind: "card", min, max, candidates: [ref(10, DECK, 0, 0), ref(20, DECK, 0, 1), ref(20, DECK, 0, 2), ref(30, GRAVE, 0, 0)],
  }) as unknown as PromptData;

  /** The pile view's clicks as PromptView wires them: a toggle remembers the selection before it; a double answers from there. */
  function clicker(p: PromptData, enabled = true) {
    const taps = enabled ? createDoubleTapDetector() : null;
    let selected: number[] = [];
    let before: { key: string; selected: number[] } | null = null;
    const confirmed: number[][] = [];
    const click = (groupIndex: number, at: number, x = 100, y = 100) => {
      const group = groupCandidates(p.candidates ?? [])[groupIndex];
      if (pileChoiceClick(taps, group.key, x, y, at) === "double") {
        const answer = doublePickAnswer(p, before?.key === group.key ? before.selected : selected, group);
        selected = answer.selected;
        if (answer.confirm) confirmed.push(answer.selected);
      } else {
        before = { key: group.key, selected };
        selected = toggleGroupSelection(p, selected, group);
      }
    };
    return { click, selected: () => selected, confirmed };
  }

  it("single pick: a double-click picks the card and confirms", () => {
    const c = clicker(prompt(1, 1));
    c.click(1, 1000);
    c.click(1, 1150);
    expect(c.confirmed).toEqual([[1]]);
  });

  it("a double-tap a little apart (a finger) counts too; two slow clicks don't", () => {
    const tap = clicker(prompt(1, 1));
    tap.click(0, 1000, 100, 100);
    tap.click(0, 1200, 108, 94);
    expect(tap.confirmed).toEqual([[0]]);

    const slow = clicker(prompt(1, 1));
    slow.click(0, 1000);
    slow.click(0, 1600);
    expect(slow.confirmed).toEqual([]);
    expect(slow.selected()).toEqual([]); // the second click unpicked it, as a single click does
  });

  it("multi pick: a double-click toggles the card once and confirms when that completes the choice", () => {
    const c = clicker(prompt(2, 2));
    c.click(0, 1000); // a single click: picked
    c.click(2, 2000);
    c.click(2, 2100); // double-click: picked (once), 2 of 2 → confirmed
    expect(c.confirmed).toEqual([[0, 3]]);
  });

  it("multi pick: a double-click that leaves the choice incomplete only picks", () => {
    const c = clicker(prompt(2, 3));
    c.click(0, 1000);
    c.click(0, 1100);
    expect(c.selected()).toEqual([0]);
    expect(c.confirmed).toEqual([]);
  });

  it("with the double-click setting off, every click is a single click", () => {
    const c = clicker(prompt(1, 1), false);
    c.click(1, 1000);
    c.click(1, 1100);
    expect(c.confirmed).toEqual([]);
    expect(c.selected()).toEqual([]);
    expect(pileChoiceClick(null, "k", 0, 0, 0)).toBe("toggle");
  });
});
