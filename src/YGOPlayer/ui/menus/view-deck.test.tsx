import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Card } from "ygo-core";
import type { YGODuel } from "../../core/YGODuel";
import type { Deck } from "../../game/Deck";
import { ViewDeckPopup } from "./view-deck";

const card = (index: number, name: string, frameType: string, type: string) =>
  ({ id: 1000 + index, index, name, frameType, type, images: { small_url: `${name}.jpg` } }) as unknown as Card;

const MAIN_DECK = [
  card(0, "Ash Blossom", "effect", "Effect Monster"),
  card(1, "Pot of Prosperity", "spell", "Spell Card"),
  card(2, "Infinite Impermanence", "trap", "Trap Card"),
];

function duel(): YGODuel {
  return {
    events: { dispatch: vi.fn() },
    ygo: { state: { fields: [{ mainDeck: MAIN_DECK }, { mainDeck: [] }] } },
  } as unknown as YGODuel;
}

const deck = { player: 0 } as Deck;

describe("ViewDeckPopup", () => {
  it("renders nothing while hidden", () => {
    expect(renderToStaticMarkup(<ViewDeckPopup duel={duel()} deck={deck} visible={false} />)).toBe("");
  });

  it("lists the player's Main Deck from the top (last card first)", () => {
    const html = renderToStaticMarkup(<ViewDeckPopup duel={duel()} deck={deck} visible />);
    const names = [...html.matchAll(/<img[^>]*alt="([^"]+)"/g)].map((m) => m[1]);
    expect(names).toEqual(["Infinite Impermanence", "Pot of Prosperity", "Ash Blossom"]);
  });

  it("makes each card a keyboard-openable button with its name", () => {
    const html = renderToStaticMarkup(<ViewDeckPopup duel={duel()} deck={deck} visible />);
    expect(html).toContain('aria-label="Ash Blossom"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('src="Ash Blossom.jpg"');
  });

  it("offers the monster / spell / trap filters, none pressed at first", () => {
    const html = renderToStaticMarkup(<ViewDeckPopup duel={duel()} deck={deck} visible />);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(3);
  });
});
