import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { YGOPerspective, setActivePerspective } from "../core/YGOPerspective";
import { DuelPerspectiveContext } from "./duel-perspective";
import { DuelLogRow } from "./menus/duel-log/duel-log-components";
import { CardMenu } from "./components/CardMenu";

function perspective(pov: number) {
  const p = new YGOPerspective();
  p.set({ playerIndex: pov, otherPlayerIndex: 1 - pov, playerPOV: pov });
  return p;
}

describe("duel perspective in the UI", () => {
  it("two duels on one page render each from its own side", () => {
    const html = renderToStaticMarkup(<>
      <DuelPerspectiveContext.Provider value={perspective(0)}><DuelLogRow log={{ player: 0 }}>a</DuelLogRow></DuelPerspectiveContext.Provider>
      <DuelPerspectiveContext.Provider value={perspective(1)}><DuelLogRow log={{ player: 0 }}>b</DuelLogRow></DuelPerspectiveContext.Provider>
    </>);
    expect(html).toBe('<div class="ygo-duel-log-row ygo-player-0">a</div><div class="ygo-duel-log-row ygo-player-1">b</div>');
  });

  it("card menu indicator follows the provided perspective", () => {
    const own = renderToStaticMarkup(<DuelPerspectiveContext.Provider value={perspective(1)}><CardMenu indicator playerIndex={1} /></DuelPerspectiveContext.Provider>);
    const other = renderToStaticMarkup(<DuelPerspectiveContext.Provider value={perspective(1)}><CardMenu indicator playerIndex={0} /></DuelPerspectiveContext.Provider>);
    expect(own).toContain('class="ygo-card-menu  ygo-card-menu-indicator"');
    expect(other).toContain("ygo-card-menu-indicator ygo-player-1");
  });

  it("without a provider it falls back to the duel created last", () => {
    setActivePerspective(perspective(1));
    expect(renderToStaticMarkup(<DuelLogRow log={{ player: 1 }}>x</DuelLogRow>)).toContain("ygo-player-0");
    setActivePerspective(new YGOPerspective());
  });
});
