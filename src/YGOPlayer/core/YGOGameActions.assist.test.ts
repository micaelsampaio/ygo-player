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

const LACRIMA = 28803166;
const inHand = { code: LACRIMA, ctrl: 0, loc: 0x02, seq: 0 };
const idle = (extra: Record<string, any> = {}) => ({ available: true, pending: "idle", options: { summonable: [inHand], spSummon: [], mset: [], sset: [], activatable: [] }, ...extra });
const openWindow = { available: true, pending: "chain", respond: { activatable: [], canPass: true, forced: false, chainLength: 0 } };

const flush = () => new Promise((r) => setTimeout(r, 0));

function setup(initial: any, answers: any[]) {
  const listeners = new Map<string, Function[]>();
  const dispatch = vi.fn((event: string, payload?: any) => (listeners.get(event) ?? []).forEach((l) => l(payload)));
  const assist = {
    query: vi.fn(async () => answers.shift()),
    choose: vi.fn(async (_action: any) => ({})),
  };
  const duel: any = {
    assist,
    client: { type: YGOClientType.PLAYER },
    events: {
      dispatch,
      on: (e: string, l: Function) => listeners.set(e, [...(listeners.get(e) ?? []), l]),
      off: (e: string, l: Function) => listeners.set(e, (listeners.get(e) ?? []).filter((x) => x !== l)),
    },
    serverActions: { getActivePlayer: () => 0 },
    execCommand: vi.fn(),
    gameController: { getComponent: () => ({ startSelection: vi.fn(), startMultipleSelection: vi.fn() }) },
    ygo: { state: { fields: [{ extraDeck: [] }, { extraDeck: [] }], registerCardData: vi.fn() }, options: { assistedMode: true } },
  };
  duel.assistController = new YGOAssistController(duel);
  duel.assistController.options = initial;
  const actions = new YGOGameActions(duel);
  const events = (name: string) => dispatch.mock.calls.filter((c) => c[0] === name).map((c) => c[1]);
  return { duel, assist, actions, events };
}

const card = { id: LACRIMA, name: "Lacrima", originalOwner: 0 } as any;

describe("YGOGameActions — Assisted Mode card-menu routing", () => {
  it("makes a move the engine lists through assist.choose", async () => {
    const s = setup(idle(), []);
    s.actions.normalSummon({ card, originZone: "H-1" as any });
    await flush();
    expect(s.assist.choose).toHaveBeenCalledWith({ commandType: "Normal Summon", data: { id: LACRIMA, ctrl: 0, loc: 0x02, seq: 0 } });
    expect(s.duel.execCommand).not.toHaveBeenCalled();
    expect(s.events("assist-choice-start")).toEqual([{ code: LACRIMA }]);
    expect(s.events("assist-choice-done")).toEqual([{ notices: undefined }]);
  });

  it("continues past the open window, re-queries and makes the move — the new options are stored and published", async () => {
    const next = idle();
    const s = setup(openWindow, [next]);
    s.actions.normalSummon({ card, originZone: "H-1" as any });
    await flush();
    expect(s.assist.choose.mock.calls.map((c) => c[0].commandType)).toEqual(["Pass", "Normal Summon"]);
    expect(s.duel.assistController.options).toBe(next);
    expect(s.events("assist-options")).toEqual([next]);
  });

  it("says the card can't do it when the engine still doesn't list the move after Continue", async () => {
    const s = setup(openWindow, [{ available: true, pending: "idle", options: {} }]);
    s.actions.normalSummon({ card, originZone: "H-1" as any });
    await flush();
    expect(s.events("assist-choice-done")).toEqual([{ notices: ["Lacrima can't do that right now."] }]);
  });

  it("falls back to the free-form move (with a notice) when the engine doesn't list it", () => {
    const s = setup({ available: false }, []);
    s.actions.normalSummon({ card, originZone: "H-1" as any });
    expect(s.assist.choose).not.toHaveBeenCalled();
    expect(s.events("assist-notice")).toHaveLength(1);
  });
});

describe("YGOGameActions — Assisted Mode phase menu", () => {
  it("walks phase by phase through the engine, publishing each answer, and stops at an open window", async () => {
    const battle = idle({ ygoPhase: "Battle", nextPhase: "Main Phase 2" });
    const s = setup(idle({ ygoPhase: "Main Phase 1", nextPhase: "Battle" }), [battle, openWindow]);
    await s.actions.goToPhaseAssisted(["Battle", "Main Phase 2", "End"] as any);
    expect(s.assist.choose.mock.calls.map((c) => c[0].data.phase)).toEqual(["Battle", "Main Phase 2"]);
    expect(s.duel.assistController.options).toBe(openWindow);
    expect(s.events("assist-options")).toEqual([battle, openWindow]);
    expect(s.events("assist-choice-done")).toEqual([{ notices: undefined }]);
  });

  it("returns null (free-form change) when the engine doesn't take the first step", () => {
    const s = setup({ available: false }, []);
    expect(s.actions.goToPhaseAssisted(["Battle"] as any)).toBeNull();
  });
});
