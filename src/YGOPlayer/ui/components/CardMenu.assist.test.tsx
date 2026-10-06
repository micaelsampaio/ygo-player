import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CardMenu } from "./CardMenu";
import { LOC_HAND } from "../assist-prompt";

/** A bot duel with Assisted Mode whose engine offers Normal Summon for card 100 in hand. */
function duel({ botDuel = true }: { botDuel?: boolean } = {}): any {
  const options = {
    available: true, pending: "idle",
    options: { summonable: [{ code: 100, ctrl: 0, loc: LOC_HAND, seq: 0 }], spSummon: [], reposition: [], mset: [], sset: [], activatable: [], toBattle: true, toEnd: true },
  };
  return {
    assist: {},
    ygo: { options: { assistedMode: true, botDuel }, state: { getCardData: () => ({ name: "Chamber Dragonmaid", type: "Effect Monster" }) } },
    perspective: { isPlayer: (p: number) => p === 0, isPlayerPOV: () => true },
    assistController: { options, subscribe: () => () => {} },
    events: { dispatch: () => {} },
  };
}
const card: any = { id: 100, owner: 0 };

describe("CardMenu in Master Duel style", () => {
  it("lists the engine's moves first and folds the free-play moves", () => {
    const html = renderToStaticMarkup(<CardMenu assist={{ duel: duel(), card, zone: "H-1" }}><button>Free move</button></CardMenu>);
    expect(html).toContain("Normal Summon");
    expect(html).toContain("Free-play moves…");
    expect(html).not.toContain("Free move");
  });

  it("is the plain menu outside assisted bot duels, and for the opponent's cards", () => {
    expect(renderToStaticMarkup(<CardMenu assist={{ duel: duel({ botDuel: false }), card, zone: "H-1" }}><button>Free move</button></CardMenu>)).toContain("Free move");
    expect(renderToStaticMarkup(<CardMenu assist={{ duel: duel(), card: { id: 100, owner: 1 }, zone: "H2-1" }}><button>Free move</button></CardMenu>)).toContain("Free move");
  });

  it("says when the card has no move right now", () => {
    const html = renderToStaticMarkup(<CardMenu assist={{ duel: duel(), card: { id: 999, owner: 0 }, zone: "H-1" }}><button>Free move</button></CardMenu>);
    expect(html).toContain("No moves for this card right now");
  });
});
