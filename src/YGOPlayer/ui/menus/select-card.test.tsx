import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Card } from "ygo-core";
import type { YGODuel } from "../../core/YGODuel";
import { SelectCardPopup } from "./select-card";

const card = (index: number, name: string, type: string, owner = 0) =>
  ({ id: 2000 + index, index, name, type, owner, typeline: [], frameType: "effect", images: { small_url: `${name}.jpg` } }) as unknown as Card;

function duel(field: { monsterZone?: (Card | null)[]; extraMonsterZone?: (Card | null)[]; hand?: Card[] }): YGODuel {
  const player = { monsterZone: [], extraMonsterZone: [], hand: [], ...field };
  return { events: { dispatch: vi.fn() }, ygo: { state: { fields: [player] } } } as unknown as YGODuel;
}

const MONSTERS = { monsters: true, field: true, hand: true, mainDeck: false };
const imgs = (html: string) => [...html.matchAll(/<img[^>]*src="([^"]+)\.jpg"/g)].map((m) => m[1]);

describe("SelectCardPopup", () => {
  it("lists the monsters on the field (Main and Extra Monster Zones), then the monsters in hand", () => {
    const html = renderToStaticMarkup(
      <SelectCardPopup
        player={0}
        visible
        filter={MONSTERS}
        onSelectCards={() => {}}
        duel={duel({
          monsterZone: [null, card(1, "Dragonmaid", "Effect Monster")],
          extraMonsterZone: [card(2, "Accesscode", "Link Monster")],
          hand: [card(3, "Bonfire", "Spell Card"), card(4, "Ash", "Effect Monster")],
        })}
      />,
    );
    expect(html).toContain("Monsters Zone");
    expect(html).toContain("Hand");
    expect(imgs(html)).toEqual(["Dragonmaid", "Accesscode", "Ash"]);
  });

  it("leaves out the opponent's monster in an Extra Monster Zone", () => {
    const html = renderToStaticMarkup(
      <SelectCardPopup player={0} visible filter={MONSTERS} onSelectCards={() => {}}
        duel={duel({ extraMonsterZone: [card(2, "Their Link", "Link Monster", 1)] })} />,
    );
    expect(imgs(html)).toEqual([]);
    expect(html).not.toContain("Monsters Zone");
  });

  it("shows no cards when the filter excludes the field", () => {
    const html = renderToStaticMarkup(
      <SelectCardPopup player={0} visible filter={{ ...MONSTERS, field: false }} onSelectCards={() => {}}
        duel={duel({ monsterZone: [card(1, "Dragonmaid", "Effect Monster")], hand: [card(4, "Ash", "Effect Monster")] })} />,
    );
    expect(imgs(html)).toEqual([]);
    expect(html).toContain("Decide");
  });
});
