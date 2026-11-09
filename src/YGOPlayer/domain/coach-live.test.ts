import { describe, expect, it } from "vitest";
import { atLeastOne, handTrapWarning, keyCardNote, lethalCheck, liveHandTraps, outlookLine, readStory } from "./coach-live";
import type { CoachStats } from "../types";

describe("liveHandTraps", () => {
  const ash = { name: "Ash Blossom", code: 14558127, chance: 0.5, dist: [{ copies: 3, share: 1 }] };

  it("recounts with their hand and deck now, minus the copies shown", () => {
    const shown = new Map<number, number>();
    const [fresh] = liveHandTraps([ash], { handSize: 5, deckSize: 35, shown });
    expect(fresh.chance).toBeCloseTo(atLeastOne(3, 5, 40), 10);
    const [used] = liveHandTraps([ash], { handSize: 4, deckSize: 34, shown: new Map([[14558127, 1]]) });
    expect(used.shown).toBe(1);
    expect(used.chance).toBeCloseTo(atLeastOne(2, 4, 38), 10);
    expect(used.chance).toBeLessThan(fresh.chance);
    // All 3 shown: gone from the list.
    expect(liveHandTraps([ash], { handSize: 4, deckSize: 30, shown: new Map([[14558127, 3]]) })).toEqual([]);
  });

  it("keeps the opening-hand chance without a distribution or a view", () => {
    expect(liveHandTraps([{ name: "Nibiru", chance: 0.3 }], null)[0].chance).toBe(0.3);
  });

  it("warns only when one is likely enough", () => {
    expect(handTrapWarning([{ name: "Ash Blossom", chance: 0.38, shown: 0 }])).toContain("~38% they hold Ash Blossom");
    expect(handTrapWarning([{ name: "Ash Blossom", chance: 0.1, shown: 0 }])).toBe("");
  });
});

describe("lethalCheck", () => {
  it("direct damage into an empty field", () => {
    expect(lethalCheck([2500, 1600], [], 4000)).toMatchObject({ damage: 4100, lethal: true });
  });

  it("clears a blocker with one attacker, the rest go direct", () => {
    // 3000 into the 2000 ATK monster (1000) + 1800 direct = 2800.
    expect(lethalCheck([3000, 1800], [{ atk: 2000, def: 0, position: "attack" }], 8000)?.damage).toBe(2800);
  });

  it("a Defense Position wall nobody beats: no direct damage", () => {
    expect(lethalCheck([1500, 1500], [{ atk: 0, def: 2500, position: "defense" }], 8000)?.damage).toBe(0);
  });

  it("flags face-downs and returns null without attackers", () => {
    expect(lethalCheck([2000], [{ atk: 0, def: 0, position: "facedown" }], 8000)?.assumesFaceDown).toBe(true);
    expect(lethalCheck([], [], 8000)).toBeNull();
  });
});

describe("readStory + outlookLine", () => {
  const stats: CoachStats = {
    format: "TCG", deckType: { name: "Fire King", confidence: 0.9 },
    goingFirst: { games: 100, wins: 49 }, goingSecond: { games: 100, wins: 41 },
    stoppedBy: [{ name: "Ash Blossom", code: 7, games: 20, wins: 6 }],
    oppAnswers: { deckType: "Dracotail", byInterruptions: [{ label: "0", games: 50, wins: 35 }, { label: "1", games: 40, wins: 21 }], answers: [] },
  };
  const me = 0;

  it("they went first: their win rate after your interruptions on their turn 1", () => {
    const logs = [
      { type: "DuelTurn", turn: 1, turnPlayer: 1 },
      { type: "Activate", player: 1, id: 5 },
      { type: "Activate", player: 0, id: 7 },
      { type: "DuelTurn", turn: 2, turnPlayer: 0 },
    ];
    const story = readStory(logs, me, null, 2);
    expect(story).toMatchObject({ goingFirst: 1, turn: 2, interruptedTheirTurn1: 1 });
    expect(outlookLine(stats, story, me)).toBe("You interrupted their turn 1 once: Dracotail won 53% of games like this (40 games).");
  });

  it("you went first and they hit you with a hand trap", () => {
    const logs = [
      { type: "Turn Order", goingFirst: 0 },
      { type: "DuelTurn", turn: 1, turnPlayer: 0 },
      { type: "Activate", player: 1, id: 7 },
      { type: "DuelTurn", turn: 2, turnPlayer: 1 },
    ];
    expect(outlookLine(stats, readStory(logs, me, null, 2), me)).toBe("They hit you with Ash Blossom on turn 1: Fire King won 30% of those games (20 games).");
  });

  it("before anything happened: the going first / second rate", () => {
    expect(outlookLine(stats, readStory([], me, 1, 1), me)).toBe("Going second: Fire King won 41% (100 games).");
    expect(outlookLine(stats, readStory([], me, null, 1), me)).toBeNull();
  });

  it("key card note from their choke points", () => {
    const opp = { deckType: "Dracotail", answers: [], chokePoints: [{ code: 9, name: "Faimena", games: 10, wins: 4 }] };
    expect(keyCardNote(9, opp)).toContain("Faimena is a key card for them");
    expect(keyCardNote(8, opp)).toBeNull();
  });
});
