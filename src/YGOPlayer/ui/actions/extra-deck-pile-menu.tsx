import { useCallback, useLayoutEffect, useRef } from "react";
import { YGODuel } from "../../core/YGODuel";
import { CardMenu } from "../components/CardMenu";
import { getTransformFromCamera } from "../../scripts/ygo-utils";
import { ExtraDeck } from "../../game/ExtraDeck";
import { YGOGameUtils } from "ygo-core";

export function ExtraDeckPileMenu({
  duel,
  player,
  extraDeck,
  clearAction,
}: {
  duel: YGODuel;
  player: number;
  extraDeck: ExtraDeck;
  clearAction: Function;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const field = duel.ygo.state.fields[player];

  const viewExtraDeck = useCallback(() => {
    clearAction();
    duel.events.dispatch("set-ui-menu", {
      group: "game-overlay",
      type: "extra-deck",
      data: { player, extraDeck },
    });
  }, [player, extraDeck, clearAction]);

  const revealExtraDeck = useCallback(() => {
    duel.gameActions.showExtraDeck({ player });
  }, [player]);

  const banishRandomFaceDown = useCallback(() => {
    const extra = duel.ygo.state.fields[player].extraDeck;
    if (extra.length === 0) return;
    const idx = Math.floor(Math.random() * extra.length);
    const card = extra[idx];
    const zone = YGOGameUtils.createZone("ED", player, idx + 1);
    duel.gameActions.banishMultiple({ cards: [{ card, zone }], position: "facedown" });
  }, [player]);

  const banishRandomFaceUp = useCallback(() => {
    const extra = duel.ygo.state.fields[player].extraDeck;
    if (extra.length === 0) return;
    const idx = Math.floor(Math.random() * extra.length);
    const card = extra[idx];
    const zone = YGOGameUtils.createZone("ED", player, idx + 1);
    duel.gameActions.banishMultiple({ cards: [{ card, zone }], position: "faceup" });
  }, [player]);

  useLayoutEffect(() => {
    const container = menuRef.current!;
    const size = container.getBoundingClientRect();
    const { x, y, width } = getTransformFromCamera(duel, extraDeck.gameObject);

    const top = Math.max(0, y - size.height);
    const left = x - size.width / 2 + width / 2;

    const clampedTop = Math.min(top, window.innerHeight - size.height);
    const clampedLeft = Math.max(0, Math.min(left, window.innerWidth - size.width));

    container.style.top = clampedTop + "px";
    container.style.left = clampedLeft + "px";
  }, [extraDeck]);

  const isEmpty = field.extraDeck.length === 0;

  return (
    <CardMenu menuRef={menuRef}>
      <button className="ygo-card-item" type="button" onClick={viewExtraDeck}>
        View Extra Deck
      </button>
      <button className="ygo-card-item" type="button" onClick={revealExtraDeck} disabled={isEmpty}>
        Reveal Extra Deck
      </button>
      <button className="ygo-card-item" type="button" onClick={banishRandomFaceDown} disabled={isEmpty}>
        Banish FD Random
      </button>
      <button className="ygo-card-item" type="button" onClick={banishRandomFaceUp} disabled={isEmpty}>
        Banish FU Random
      </button>
    </CardMenu>
  );
}
