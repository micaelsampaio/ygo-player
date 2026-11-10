import { describe, expect, it } from "vitest";
import { readCoachNow, shownByOpp } from "./use-coach-now";
import type { DuelTurnState } from "../use-duel-turn-state";

const card = (id: number, position = "faceup-attack", atk = 0, def = 0) => ({ id, position, atk, def, currentAtk: atk, currentDef: def });
const field = (over: Record<string, unknown> = {}) => ({
  lp: 8000, hand: [], mainDeck: [], graveyard: [], banishedZone: [],
  monsterZone: [null, null, null, null, null], spellTrapZone: [null, null, null, null, null], fieldZone: null, extraMonsterZone: [null, null],
  ...over,
});
const names: Record<number, string> = { 1: "Ash Blossom", 9: "Faimena" };
const duelWith = (fields: unknown[], logs: unknown[] = []) => ({
  perspective: { playerIndex: 0 },
  ygo: { state: { fields, getCardData: (c: number) => (names[c] ? { name: names[c] } : undefined) }, duelLog: { logs }, options: { goingFirstPlayer: 1 } },
}) as never;
const turn = (over: Partial<DuelTurnState>): DuelTurnState => ({
  turn: 2, turnPlayer: 0, turnPriority: 0, phase: "Main Phase 1", isPlayerClient: true, isLocalTurn: true, hasPriority: true, ...over,
});

describe("readCoachNow", () => {
  it("counts the copies they've shown, not their face-down cards", () => {
    const opp = field({ graveyard: [card(1)], spellTrapZone: [card(1, "facedown"), null, null, null, null], hand: [card(0), card(0)], mainDeck: new Array(30).fill(card(0)) });
    const view = shownByOpp(duelWith([field(), opp]), 1)!;
    expect(view.shown.get(1)).toBe(1);
    expect(view).toMatchObject({ handSize: 2, deckSize: 30 });
  });

  it("Battle Phase: the lethal check from the engine's attackers", () => {
    const me = field({ monsterZone: [card(5, "faceup-attack", 2500), card(6, "faceup-attack", 2000), null, null, null] });
    const opp = field({ lp: 4000 });
    const result = { available: true, pending: "battle", options: { attackable: [{ code: 5, ctrl: 0, loc: 4, seq: 0, pos: 1 }, { code: 6, ctrl: 0, loc: 4, seq: 1, pos: 1 }], activatable: [], toMain2: true, toEnd: true } } as never;
    const now = readCoachNow(duelWith([me, opp]), null, turn({ phase: "Battle" }), result);
    expect(now.tip).toContain("Lethal: you can deal 4,500");
  });

  it("their chain link: the key card note and each card's tips", () => {
    const stats = { format: "TCG", oppAnswers: { deckType: "Dracotail", answers: [], chokePoints: [{ code: 9, name: "Faimena", games: 10, wins: 4 }] } };
    const result = {
      available: true, pending: "chain",
      respond: { activatable: [{ code: 1, ctrl: 0, loc: 2, seq: 0, pos: 0 }], canPass: true, forced: false, chain: [{ code: 9, ctrl: 1, loc: 2, seq: 0, pos: 0 }] },
      coach: { hints: [], model: "replays", responses: [{ action: { commandType: "Activate", data: { id: 1, ctrl: 0, loc: 2, seq: 0 } }, denies: 2 }] },
    } as never;
    const now = readCoachNow(duelWith([field(), field()]), stats, turn({ isLocalTurn: false, turnPlayer: 1, phase: "Main Phase 1" }), result);
    expect(now.responses?.target).toBe("Faimena");
    expect(now.responses?.keyNote).toContain("key card");
    expect(now.responses?.tips[0].lines.join(" ")).toContain("Faimena is their choke point");
    expect(now.responses?.tips[0].lines.join(" ")).toContain("they end this chain with 2 cards fewer");
  });
});
