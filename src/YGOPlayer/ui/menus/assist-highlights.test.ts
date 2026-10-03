import { describe, expect, it, vi } from "vitest";
vi.mock("../../game/meshes/highlight-frame", () => ({
  createHighlightFrame: vi.fn(), disposeHighlightFrame: vi.fn(), placeHighlightFrame: vi.fn(),
  HIGHLIGHT_COLOR: 1, HIGHLIGHT_CSS: "a", QUICK_COLOR: 2, QUICK_CSS: "b",
}));
import { promptTargets } from "./assist-highlights";
import { LOC_GRAVE, LOC_HAND, LOC_MZONE, LOC_SZONE } from "../assist-prompt";
import type { PromptData } from "../assist-prompt";

const prompt = {
  player: 0,
  candidates: [
    { code: 1, ctrl: 0, loc: LOC_HAND },
    { code: 2, ctrl: 1, loc: LOC_MZONE },
    { code: 3, ctrl: 0, loc: LOC_GRAVE },
    { code: 4, ctrl: 0, loc: LOC_SZONE },
  ],
} as unknown as PromptData;

describe("promptTargets", () => {
  it("frames hand/field candidates on the local player's side when they are the prompt player's", () => {
    expect(promptTargets(prompt, 0)).toEqual([
      { code: 1, side: 0, loc: LOC_HAND },
      { code: 2, side: 1, loc: LOC_MZONE },
      { code: 4, side: 0, loc: LOC_SZONE },
    ]);
  });
  it("mirrors the sides for local player 1", () => {
    expect(promptTargets(prompt, 1).map((t) => t.side)).toEqual([1, 0, 1]);
  });
  it("no prompt, no targets", () => {
    expect(promptTargets(null, 0)).toEqual([]);
  });
});
