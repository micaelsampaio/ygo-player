import { describe, expect, it } from "vitest";
import { nextPuzzleView, opponentPolicyText, puzzleProgress, puzzleResultTitle, readPuzzleView, retryRequestOf } from "./puzzle-state";
import { roomEventFor, duelRoomId } from "../../core/room-events";

const view = (over: Record<string, unknown> = {}) => ({
  roomId: "r1",
  puzzleId: "through-the-mirror",
  name: "Through the Mirror",
  description: "Deal at least 3000 damage this turn.",
  difficulty: 2,
  goal: { type: "damage", amount: 3000 },
  goalText: "Deal 3000 damage this turn",
  opponentPolicy: "eager",
  hint: "The set card is Mirror Force.",
  status: "playing",
  damageDealt: 0,
  attempt: 1,
  ...over,
});

describe("puzzle-state", () => {
  it("reads a PuzzleView and rejects malformed ones", () => {
    expect(readPuzzleView(view())).toMatchObject({ puzzleId: "through-the-mirror", goal: { type: "damage", amount: 3000 } });
    expect(readPuzzleView(null)).toBeNull();
    expect(readPuzzleView(view({ goal: { type: "damage", amount: -1 } }))).toBeNull();
    expect(readPuzzleView(view({ status: "won" }))).toBeNull();
    expect(readPuzzleView(view({ goalText: "", goal: { type: "win" } }))!.goalText).toBe("Win this turn");
  });

  it("follows the server's updates, keeps the first verdict, ignores other rooms and older attempts", () => {
    let current = readPuzzleView(view());
    current = nextPuzzleView(current, view({ damageDealt: 1200 }));
    expect(current!.damageDealt).toBe(1200);
    current = nextPuzzleView(current, view({ status: "solved", reason: "You dealt 4200 damage.", damageDealt: 4200 }));
    expect(current!.status).toBe("solved");
    expect(nextPuzzleView(current, view({ status: "failed", damageDealt: 4200 }))!.status).toBe("solved");
    expect(nextPuzzleView(current, view({ roomId: "other", status: "playing" }))!.status).toBe("solved");
    expect(nextPuzzleView(current, { junk: true })).toBe(current);
    const older = nextPuzzleView(readPuzzleView(view({ attempt: 2 })), view({ attempt: 1, status: "failed" }));
    expect(older!.status).toBe("playing");
  });

  it("describes progress, the opponent and the result", () => {
    const p = puzzleProgress(readPuzzleView(view({ damageDealt: 4200 }))!)!;
    expect(p).toMatchObject({ dealt: 3000, target: 3000, ratio: 1, label: "4200 / 3000 damage" });
    expect(puzzleProgress(readPuzzleView(view({ goal: { type: "win" } }))!)).toBeNull();
    expect(opponentPolicyText("pass")).toMatch(/won't/);
    expect(puzzleResultTitle(readPuzzleView(view({ status: "failed" }))!)).toBe("Not this time");
    expect(puzzleResultTitle(readPuzzleView(view())!)).toBeNull();
    expect(retryRequestOf(readPuzzleView(view({ attempt: 3 }))!)).toEqual({ roomId: "r1", puzzleId: "through-the-mirror", attempt: 3 });
  });
});

describe("room-events", () => {
  it("maps the server's room events to duel events, for this room only", () => {
    expect(roomEventFor("puzzle:state", { roomId: "r1" }, "r1")).toBe("puzzle-state");
    expect(roomEventFor("duel:deck:contents", { roomId: "r1" }, "r1")).toBe("deck-search-contents");
    expect(roomEventFor("puzzle:state", { roomId: "r2" }, "r1")).toBeNull();
    expect(roomEventFor("server:exec", {}, "r1")).toBeNull();
    expect(duelRoomId({ roomId: "r1" })).toBe("r1");
    expect(duelRoomId({})).toBeNull();
  });
});
