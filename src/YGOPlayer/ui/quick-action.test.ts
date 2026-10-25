import { describe, expect, it, vi } from "vitest";
import { YGOClientType } from "ygo-core";
import { positionPromptFor, quickActionEnabled, quickActionFor, runQuickAction } from "./quick-action";
import { LOC_GRAVE, LOC_HAND, LOC_MZONE } from "./assist-prompt";

const CARDS: Record<number, { name: string; type: string }> = {
  100: { name: "Dragon", type: "Effect Monster" },
  300: { name: "Pot", type: "Spell Card" },
};
const ref = (code: number, loc: number, seq = 0) => ({ code, ctrl: 0, loc, seq });
const idle = (o: Record<string, unknown[]>) => ({
  available: true, pending: "idle",
  options: { summonable: [], spSummon: [], reposition: [], mset: [], sset: [], activatable: [], toBattle: true, toEnd: true, ...o },
});

function fakeDuel(options: unknown, { setting, opponentMonsters = 0 }: { setting?: boolean; opponentMonsters?: number } = {}) {
  return {
    assist: {},
    client: { type: YGOClientType.PLAYER },
    ygo: {
      options: { assistedMode: true },
      state: {
        getCardData: (code: number) => CARDS[code],
        fields: [{}, { monsterZone: Array.from({ length: 5 }, (_, i) => (i < opponentMonsters ? {} : null)), extraMonsterZone: [null, null] }],
      },
    },
    settings: { getConfigFromPath: () => setting },
    perspective: { playerIndex: 0, isPlayer: (p: number) => p === 0 },
    assistController: { options },
    events: { dispatch: vi.fn() },
    actionManager: { clearAction: vi.fn() },
  } as any;
}
const card = (id: number) => ({ id, ...CARDS[id] }) as any;

describe("quickActionFor", () => {
  it("runs a hand monster's Normal Summon over its Set", () => {
    const duel = fakeDuel(idle({ summonable: [ref(100, LOC_HAND)], mset: [ref(100, LOC_HAND)] }));
    expect(quickActionFor(duel, card(100), "H-1", "hand", 0)?.commandType).toBe("Normal Summon");
  });

  it("nothing for the opponent's cards, with the setting off, or outside Assisted Mode", () => {
    const options = idle({ activatable: [ref(300, LOC_HAND)] });
    expect(quickActionFor(fakeDuel(options), card(300), "H2-1", "hand", 1)).toBeNull();
    expect(quickActionFor(fakeDuel(options, { setting: false }), card(300), "H-1", "hand", 0)).toBeNull();
    const manual = { ...fakeDuel(options), ygo: { options: {}, state: fakeDuel(options).ygo.state } };
    expect(quickActionEnabled(manual)).toBe(false);
    expect(quickActionFor(manual, card(300), "H-1", "hand", 0)).toBeNull();
  });

  it("a chain window's single activation from the GY", () => {
    const chain = { available: true, pending: "chain", respond: { activatable: [ref(100, LOC_GRAVE)], canPass: true, forced: false, chainLength: 1 } };
    expect(quickActionFor(fakeDuel(chain), card(100), "GY", "pile", 0)?.commandType).toBe("Activate");
  });

  it("Battle Phase: the monster in that zone attacks (one target at most)", () => {
    const battle = { available: true, pending: "battle", options: { attackable: [ref(100, LOC_MZONE, 2)], activatable: [], toMain2: true, toEnd: true } };
    expect(quickActionFor(fakeDuel(battle, { opponentMonsters: 1 }), card(100), "M-3", "field", 0)?.commandType).toBe("Attack");
    expect(quickActionFor(fakeDuel(battle, { opponentMonsters: 1 }), card(100), "M-1", "field", 0)).toBeNull();
    expect(quickActionFor(fakeDuel(battle, { opponentMonsters: 2 }), card(100), "M-3", "field", 0)).toBeNull();
  });
});

describe("runQuickAction", () => {
  it("sends the row like a card-menu pick; a summon from the hand carries a zone-less drop intent", () => {
    const duel = fakeDuel(null);
    runQuickAction(duel, { key: "Normal Summon:100", label: "Normal Summon", commandType: "Normal Summon", data: { id: 100 }, count: 1 }, { fromHand: 100 });
    expect(duel.events.dispatch).toHaveBeenCalledWith("clear-ui-action");
    expect(duel.events.dispatch).toHaveBeenCalledWith("assist-choose-row", {
      key: "Normal Summon:100", commandType: "Normal Summon", data: { id: 100 }, drop: { code: 100, zone: null, faceDown: false },
    });
    runQuickAction(duel, { key: "Activate:300", label: "Activate", commandType: "Activate", data: { id: 300 }, count: 1 }, { fromHand: 300 });
    expect(duel.events.dispatch).toHaveBeenLastCalledWith("assist-choose-row", { key: "Activate:300", commandType: "Activate", data: { id: 300 } });
  });
});

describe("positionPromptFor", () => {
  it("is the position question about that card with a double-click answer", () => {
    const prompt = (positions: number) => ({ available: true, pending: "prompt", prompt: { kind: "position", code: 100, positions, player: 0, msg: 19 } });
    expect(positionPromptFor(fakeDuel(prompt(0x5)), 100)).toBe(true);
    expect(positionPromptFor(fakeDuel(prompt(0x5)), 300)).toBe(false);
    expect(positionPromptFor(fakeDuel(prompt(0xc)), 100)).toBe(false);
  });
});
