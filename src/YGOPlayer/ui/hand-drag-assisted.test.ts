import { describe, expect, it, vi } from "vitest";
import { createAssistedHandDropProvider } from "./hand-drag-assisted";
import { LOC_HAND } from "./assist-prompt";

const CARDS: Record<number, any> = {
  100: { id: 100, name: "Blazing Cartesia", type: "Effect Monster", level: 4 },
  300: { id: 300, name: "Fallen of Albaz Field", type: "Spell Card", race: "Field" },
};
const ref = (code: number) => ({ code, ctrl: 0, loc: LOC_HAND, seq: 0 });
const idle = (o: Record<string, unknown[]>) => ({
  available: true, pending: "idle",
  options: { summonable: [], spSummon: [], reposition: [], mset: [], sset: [], activatable: [], toBattle: true, toEnd: true, ...o },
  nextPhase: "Battle",
}) as any;

function setup(options: any) {
  const dispatch = vi.fn();
  const duel: any = {
    ygo: { state: { getCardData: (code: number) => CARDS[code] } },
    assistController: { options },
    events: { dispatch },
  };
  const handCard = (code: number): any => ({ card: CARDS[code], player: 0, handIndex: 0, openMenu: vi.fn() });
  return { provider: createAssistedHandDropProvider(duel), dispatch, handCard };
}
const zones = [{ zone: "M-1", occupied: false }, { zone: "M-2", occupied: true }, { zone: "S-1", occupied: false }, { zone: "F", occupied: false }];
const event = {} as PointerEvent;

describe("createAssistedHandDropProvider", () => {
  it("lights the zones the engine's moves for the card allow; nothing when it has none", () => {
    const s = setup(idle({ summonable: [ref(100)], mset: [ref(100)] }));
    expect(s.provider.targets(s.handCard(100), zones)).toEqual({ zones: ["M-1"], set: true });
    expect(s.provider.targets(s.handCard(300), zones)).toBeNull();
  });

  it("sends the engine's move through the options panel with where it was dropped", () => {
    const s = setup(idle({ summonable: [ref(100)], mset: [ref(100)] }));
    const card = s.handCard(100);
    const targets = s.provider.targets(card, zones)!;
    s.provider.drop(card, { kind: "zone", zone: "M-1" }, { shift: false, event, targets });
    expect(s.dispatch).toHaveBeenCalledWith("assist-choose-row", {
      key: "Normal Summon:100", commandType: "Normal Summon", data: { id: 100 }, drop: { code: 100, zone: "M-1", faceDown: false },
    });
    s.provider.drop(card, { kind: "set" }, { shift: false, event, targets });
    expect(s.dispatch).toHaveBeenLastCalledWith("assist-choose-row", expect.objectContaining({ commandType: "Set Monster", drop: { code: 100, zone: null, faceDown: true } }));
  });

  it("activates a Field Spell dropped on the Field Zone", () => {
    const s = setup(idle({ activatable: [ref(300)] }));
    const card = s.handCard(300);
    const targets = s.provider.targets(card, zones)!;
    expect(targets).toEqual({ zones: ["F"], set: false });
    s.provider.drop(card, { kind: "zone", zone: "F" }, { shift: false, event, targets });
    expect(s.dispatch).toHaveBeenCalledWith("assist-choose-row", expect.objectContaining({ commandType: "Activate", data: { id: 300, ctrl: 0, loc: LOC_HAND, seq: 0 } }));
  });

  it("opens the card's menu when the drop could mean two effects", () => {
    // The same card listed twice in the hand = two effects folded into one Activate row (count 2).
    const s = setup(idle({ activatable: [ref(300), ref(300)] }));
    const card = s.handCard(300);
    const targets = s.provider.targets(card, zones)!;
    s.provider.drop(card, { kind: "zone", zone: "F" }, { shift: false, event, targets });
    expect(card.openMenu).toHaveBeenCalledWith(event);
    expect(s.dispatch).not.toHaveBeenCalled();
  });

  it("does nothing while the engine holds a prompt (no moves listed)", () => {
    const s = setup({ available: true, pending: "prompt", prompt: { kind: "yesNo" } });
    expect(s.provider.targets(s.handCard(100), zones)).toBeNull();
  });
});
