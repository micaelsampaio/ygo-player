import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { YGOClientType, YGOPlayerState } from "ygo-core";
import { YGOPerspective } from "../../../core/YGOPerspective";
import { PlayerHUD } from "./PlayerHUD";

function duel() {
  const perspective = new YGOPerspective();
  perspective.set({ playerIndex: 0, otherPlayerIndex: 1, playerPOV: 0 });
  const fields = ["slattmyslime", "Soldaat G"].map((name, i) => ({ state: YGOPlayerState.IDLE, player: { name }, lp: 8000 - i * 2000 }));
  return {
    perspective,
    client: { type: YGOClientType.PLAYER },
    isGameActive: true,
    events: { on: vi.fn() },
    ygo: {
      getField: (player: number) => fields[player],
      options: {},
      state: { turn: 2, turnPlayer: 0, turnPriority: 0, phase: "Main Phase 1" },
      events: { on: vi.fn() },
    },
  } as any;
}

describe("PlayerHUD", () => {
  it("shows the hexagon avatar initial, name bar and LP", () => {
    const html = renderToStaticMarkup(<PlayerHUD duel={duel()} player={0} visible />);
    expect(html).toContain("ygo-player-hud ygo-player-0 ygo-player-hud-active-turn");
    expect(html).toMatch(/ygo-player-hud-avatar-inner">S</);
    expect(html).toContain("slattmyslime");
    expect(html).toMatch(/ygo-lp-text">LP<.*ygo-lp-value">8000</);
  });

  it("renders the opponent's plate on the mirrored side", () => {
    const html = renderToStaticMarkup(<PlayerHUD duel={duel()} player={1} visible />);
    expect(html).toContain("ygo-player-hud ygo-player-1");
    expect(html).toMatch(/ygo-player-hud-avatar-inner">S</);
    expect(html).toContain("ygo-lp-value\">6000<");
  });
});
