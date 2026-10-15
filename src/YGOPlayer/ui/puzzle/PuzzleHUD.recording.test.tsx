import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PuzzleHUD } from "./PuzzleHUD";

const puzzle = (over: Record<string, unknown> = {}) => ({
  roomId: "r1", puzzleId: "p1", name: "Puzzle", goal: { type: "win" }, goalText: "Win this turn",
  status: "playing", attempt: 1, ...over,
});
const duel = (options: Record<string, unknown>) => ({
  ygo: { options }, config: {}, events: { on() {}, off() {} }, serverActions: { room: { send() {} } },
}) as never;

describe("PuzzleHUD with a combo recording", () => {
  it("renders nothing for a record goal: the room is a plain Assisted Mode duel", () => {
    expect(renderToStaticMarkup(<PuzzleHUD duel={duel({ puzzle: puzzle({ goal: { type: "record" }, kind: "record", goalText: "" }) })} />)).toBe("");
  });

  it("still shows a real puzzle's HUD", () => {
    expect(renderToStaticMarkup(<PuzzleHUD duel={duel({ puzzle: puzzle() })} />)).toContain("Win this turn");
  });
});
