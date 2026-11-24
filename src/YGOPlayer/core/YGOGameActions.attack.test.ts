import { describe, expect, it, vi } from "vitest";

vi.mock("../scripts/ygo-utils", () => ({
  getCardZones: () => [],
  getMonstersZones: () => [],
  getXyzMonstersZones: () => [],
  getGameZone: () => null,
}));
vi.mock("../actions/ActionSelectCard", () => ({ ActionCardSelection: class {} }));

import { YGOClientType } from "ygo-core";
import { YGOGameActions } from "./YGOGameActions";
import { YGOAssistController } from "./YGOAssistController";
import { ATTACK_BAD_TARGET_NOTICE, ATTACK_NOT_DIRECT_NOTICE, ATTACK_NOT_IN_BATTLE_NOTICE, ATTACK_NOT_NOW_NOTICE } from "../domain/assisted-attacks";

const OX = 5053103;
const flush = () => new Promise((r) => setTimeout(r, 0));
const attacker = (seq: number, direct = 0) => ({ code: OX, ctrl: 0, loc: 0x04, seq, pos: direct });
const battle = (attackable: any[]) => ({ available: true, pending: "battle", options: { attackable, activatable: [], toMain2: true, toEnd: true }, ygoPhase: "Battle" });
const idle = { available: true, pending: "idle", options: { summonable: [], spSummon: [], mset: [], sset: [], activatable: [], toBattle: true, toEnd: true }, ygoPhase: "Main Phase 1" };

/** A duel with Battle Ox in M-1 and M-2 for player 0; `opponent` names player 1's occupied Main Monster Zones (1-5). */
function setup(options: any, { opponent = [] as number[], assistedMode = true } = {}) {
  const dispatch = vi.fn();
  const assist = { query: vi.fn(async () => options), choose: vi.fn(async (_action: any) => ({})) };
  const zone = (player: number, i: number, has: boolean) => ({ zone: `${player === 0 ? "M" : "M2"}-${i + 1}`, zoneData: { player }, hasCard: () => has });
  const own = new Set(["M-1", "M-2"]);
  const duel: any = {
    assist,
    client: { type: YGOClientType.PLAYER },
    config: { gameMode: "DUEL" },
    manualAttacks: false,
    events: { dispatch, on: vi.fn(), off: vi.fn() },
    serverActions: { getActivePlayer: () => 0, room: { send: vi.fn() } },
    execCommand: vi.fn(),
    clearActions: vi.fn(),
    gameController: { getComponent: () => ({ startSelection: vi.fn(), startMultipleSelection: vi.fn() }) },
    fields: [0, 1].map((p) => ({
      monsterZone: [0, 1, 2, 3, 4].map((i) => zone(p, i, p === 0 ? own.has(`M-${i + 1}`) : opponent.includes(i + 1))),
      extraMonsterZone: [],
    })),
    ygo: {
      state: {
        fields: [{ extraDeck: [] }, { extraDeck: [] }],
        registerCardData: vi.fn(),
        getCardFromZone: (z: string) => (own.has(z) || opponent.some((n) => z === `M2-${n}`) ? { id: OX, name: "Battle Ox", currentAtk: 1700 } : null),
      },
      options: { assistedMode },
    },
  };
  duel.assistController = new YGOAssistController(duel);
  duel.assistController.options = options;
  const actions = new YGOGameActions(duel);
  const notices = () => dispatch.mock.calls.filter((c) => c[0] === "assist-notice").map((c) => c[1].message);
  const attack = (attackingZone: string, attackedZone: string) => actions.attack({ attackingId: OX, attackingZone, attackedId: OX, attackedZone } as any);
  const direct = (originZone: string) => actions.attackDirectly({ id: OX, originZone } as any);
  return { duel, assist, actions, notices, attack, direct };
}

describe("Assisted Mode attacks: only the engine's legal ones, nothing free-form", () => {
  it("turn 1 / Main Phase: refused with a notice, nothing sent", () => {
    const s = setup(idle, { opponent: [3] });
    s.attack("M-1", "M2-3");
    s.direct("M-1");
    expect(s.assist.choose).not.toHaveBeenCalled();
    expect(s.duel.execCommand).not.toHaveBeenCalled();
    expect(s.notices()).toEqual([ATTACK_NOT_IN_BATTLE_NOTICE, ATTACK_NOT_IN_BATTLE_NOTICE]);
  });

  it("a monster the engine doesn't list (already attacked, Defense Position): refused", () => {
    const s = setup(battle([attacker(1, 1)]), { opponent: [3] });
    expect(s.actions.canAttackThroughEngine("M-1" as any)).toBe(false);
    s.attack("M-1", "M2-3");
    expect(s.assist.choose).not.toHaveBeenCalled();
    expect(s.duel.execCommand).not.toHaveBeenCalled();
    expect(s.notices()).toEqual([ATTACK_NOT_NOW_NOTICE]);
  });

  it("a direct attack into a monster: refused; an empty target zone: refused", () => {
    const s = setup(battle([attacker(0, 0)]), { opponent: [3] });
    expect(s.actions.canAttackDirectlyThroughEngine("M-1" as any)).toBe(false);
    s.direct("M-1");
    s.attack("M-1", "M2-4");
    expect(s.assist.choose).not.toHaveBeenCalled();
    expect(s.duel.execCommand).not.toHaveBeenCalled();
    expect(s.notices()).toEqual([ATTACK_NOT_DIRECT_NOTICE, ATTACK_BAD_TARGET_NOTICE]);
  });

  it("the legal attack goes through the engine, at the chosen target", async () => {
    const s = setup(battle([attacker(0, 0)]), { opponent: [3] });
    s.attack("M-1", "M2-3");
    await flush();
    expect(s.assist.choose).toHaveBeenCalledWith({ commandType: "Attack", data: { attackingId: OX, ctrl: 0, loc: 0x04, seq: 0, attackedZone: "M2-3" } });
    expect(s.duel.execCommand).not.toHaveBeenCalled();
  });

  it("a direct attack the engine allows goes through it", async () => {
    const s = setup(battle([attacker(0, 1)]));
    s.direct("M-1");
    await flush();
    expect(s.assist.choose).toHaveBeenCalledWith({ commandType: "Attack", data: { attackingId: OX, ctrl: 0, loc: 0x04, seq: 0 } });
  });

  it("only after the explicit switch to Manual attacks is the free-form attack made", () => {
    const s = setup(idle, { opponent: [3] });
    s.duel.manualAttacks = true;
    s.attack("M-1", "M2-3");
    expect(s.assist.choose).not.toHaveBeenCalled();
    expect(s.duel.execCommand).toHaveBeenCalledTimes(1);
    expect(s.duel.execCommand.mock.calls[0][0].type).toBe("Attack");
  });

  it("a manual duel (no Assisted Mode) is unchanged: free-form attacks", () => {
    const s = setup({ available: false }, { opponent: [3], assistedMode: false });
    s.attack("M-1", "M2-3");
    s.direct("M-1");
    const types = s.duel.execCommand.mock.calls.map((c: any[]) => c[0].type);
    expect(types[0]).toBe("Attack");
    expect(types).toContain("Attack Directly");
    expect(s.notices()).toEqual([]);
  });
});
