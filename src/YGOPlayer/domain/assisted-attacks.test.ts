import { describe, expect, it } from "vitest";
import { ATTACK_BAD_TARGET_NOTICE, ATTACK_NOT_DIRECT_NOTICE, ATTACK_NOT_IN_BATTLE_NOTICE, ATTACK_NOT_NOW_NOTICE, checkAssistedAttack, engineAllowsDirect } from "./assisted-attacks";

const OX = 5053103;
const ref = (seq: number, pos = 0) => ({ code: OX, ctrl: 0, loc: 0x04, seq, pos });
const battle = (attackable: any[]) => ({ available: true, pending: "battle", options: { attackable, activatable: [], toMain2: true, toEnd: true }, ygoPhase: "Battle" }) as any;
const me = { code: OX, zone: "M-1" };

describe("checkAssistedAttack", () => {
  it("refuses outside the Battle Phase and for a monster the engine doesn't list", () => {
    expect(checkAssistedAttack({ available: true, pending: "idle", options: {} as any, ygoPhase: "Main Phase 1" }, me, null, false)).toEqual({ kind: "refused", message: ATTACK_NOT_IN_BATTLE_NOTICE });
    expect(checkAssistedAttack(null, me, null, false)).toEqual({ kind: "refused", message: ATTACK_NOT_IN_BATTLE_NOTICE });
    expect(checkAssistedAttack(battle([ref(1)]), me, null, false)).toEqual({ kind: "refused", message: ATTACK_NOT_NOW_NOTICE });
  });

  it("a target must be an opponent's monster; a direct attack needs the engine's direct flag", () => {
    expect(checkAssistedAttack(battle([ref(0)]), me, { zone: "M2-1", opponentMonster: true }, true)).toMatchObject({ kind: "engine" });
    expect(checkAssistedAttack(battle([ref(0)]), me, { zone: "M2-2", opponentMonster: false }, true)).toEqual({ kind: "refused", message: ATTACK_BAD_TARGET_NOTICE });
    expect(checkAssistedAttack(battle([ref(0, 0)]), me, null, true)).toEqual({ kind: "refused", message: ATTACK_NOT_DIRECT_NOTICE });
    expect(checkAssistedAttack(battle([ref(0, 1)]), me, null, true)).toMatchObject({ kind: "engine" });
  });

  it("engineAllowsDirect falls back to an empty field without the flag", () => {
    expect(engineAllowsDirect({ code: OX, ctrl: 0, loc: 4, seq: 0 } as any, true)).toBe(false);
    expect(engineAllowsDirect({ code: OX, ctrl: 0, loc: 4, seq: 0 } as any, false)).toBe(true);
  });
});
