/* eslint-disable @typescript-eslint/no-explicit-any -- a hand-rolled duel stub */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { YGOClientType, YGOPlayerState } from "ygo-core";
import { YGOPerspective } from "../core/YGOPerspective";
import { PlayerHUDs } from "./YGOUiController";

/** A duel with two fields; getField(-1) is undefined, as in the real core. */
function duelFor(perspective: YGOPerspective, clientType: YGOClientType) {
  const fields = ["Yugi", "Kaiba"].map((name, i) => ({ state: YGOPlayerState.IDLE, player: { name }, lp: 8000 - i * 1000 }));
  return {
    perspective,
    client: { type: clientType },
    isGameActive: true,
    events: { on: vi.fn() },
    ygo: {
      getField: (player: number) => fields[player],
      options: {},
      state: { turn: 1, turnPlayer: 0, turnPriority: 0, phase: "Main Phase 1" },
      events: { on: vi.fn() },
    },
  } as any;
}

describe("PlayerHUDs", () => {
  // F2: spectating crashed with "Cannot read properties of undefined (reading 'state')".
  it("renders both players' HUDs for a spectator (playerIndex -1)", () => {
    const perspective = new YGOPerspective();
    perspective.set({ playerIndex: -1, otherPlayerIndex: 1, playerPOV: 0 });
    const html = renderToStaticMarkup(<PlayerHUDs duel={duelFor(perspective, YGOClientType.SPECTATOR)} visible />);
    expect(html).toContain("Yugi");
    expect(html).toContain("Kaiba");
    expect(html.indexOf("Yugi")).toBeLessThan(html.indexOf("Kaiba"));
    expect(html).toContain("ygo-player-hud ygo-player-0");
    expect(html).toContain("ygo-player-hud ygo-player-1");
  });

  it("a player's own HUD comes first, as before", () => {
    const perspective = new YGOPerspective();
    perspective.set({ playerIndex: 1, otherPlayerIndex: 0, playerPOV: 1 });
    const html = renderToStaticMarkup(<PlayerHUDs duel={duelFor(perspective, YGOClientType.PLAYER)} visible />);
    expect(html.indexOf("Kaiba")).toBeLessThan(html.indexOf("Yugi"));
  });
});
