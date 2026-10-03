import { describe, expect, it } from "vitest";
import { YGOPerspective, setActivePerspective } from "./YGOPerspective";
import { YGOStatic } from "./YGOStatic";

describe("YGOPerspective", () => {
  it("defaults to player 0 seen from player 0", () => {
    const p = new YGOPerspective();
    expect([p.playerIndex, p.otherPlayerIndex, p.playerPOV]).toEqual([0, 1, 0]);
    expect(p.isPlayer(0)).toBe(true);
    expect(p.isOtherPlayer(1)).toBe(true);
    expect(p.isPlayerPOV(0)).toBe(true);
    expect(p.getPlayerCssIndex(0)).toBe(0);
    expect(p.getPlayerCssIndex(1)).toBe(1);
  });

  it("answers from its own indices", () => {
    const p = new YGOPerspective();
    p.set({ playerIndex: 1, otherPlayerIndex: 0, playerPOV: 1 });
    expect(p.isPlayer(1)).toBe(true);
    expect(p.isPlayer(0)).toBe(false);
    expect(p.isOtherPlayer(0)).toBe(true);
    expect(p.isPlayerPOV(1)).toBe(true);
    expect(p.getPlayerCssIndex(1)).toBe(0);
    expect(p.getPlayerCssIndex(0)).toBe(1);
  });

  it("a spectator (-1) keeps a POV of its own", () => {
    const p = new YGOPerspective();
    p.set({ playerIndex: -1, otherPlayerIndex: 1, playerPOV: 0 });
    expect(p.isPlayer(0)).toBe(false);
    expect(p.isPlayerPOV(0)).toBe(true);
  });

  it("two perspectives do not share state", () => {
    const a = new YGOPerspective();
    const b = new YGOPerspective();
    a.set({ playerIndex: 0, otherPlayerIndex: 1, playerPOV: 0 });
    b.set({ playerIndex: 1, otherPlayerIndex: 0, playerPOV: 1 });
    expect(a.isPlayerPOV(0)).toBe(true);
    expect(b.isPlayerPOV(0)).toBe(false);
    expect(a.playerIndex).toBe(0);
    expect(b.playerIndex).toBe(1);
  });
});

describe("YGOStatic (deprecated shim)", () => {
  it("reads and writes the active perspective", () => {
    const a = new YGOPerspective();
    a.set({ playerIndex: 1, otherPlayerIndex: 0, playerPOV: 1 });
    setActivePerspective(a);
    expect(YGOStatic.playerIndex).toBe(1);
    expect(YGOStatic.otherPlayerIndex).toBe(0);
    expect(YGOStatic.playerPOV).toBe(1);
    expect(YGOStatic.isPlayer(1)).toBe(true);
    expect(YGOStatic.isOtherPlayer(0)).toBe(true);
    expect(YGOStatic.isPlayerPOV(1)).toBe(true);
    expect(YGOStatic.getPlayerCssIndex(0)).toBe(1);

    YGOStatic.playerPOV = 0;
    expect(a.playerPOV).toBe(0);

    const b = new YGOPerspective();
    setActivePerspective(b);
    expect(YGOStatic.playerIndex).toBe(0);
    expect(a.playerIndex).toBe(1);
  });
});
