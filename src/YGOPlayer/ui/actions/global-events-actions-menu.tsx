import * as THREE from "three";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { YGODuel } from "../../core/YGODuel";
import { getTransformFromCamera, } from "../../scripts/ygo-utils";
import { CardMenu } from "../components/CardMenu";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { YGOGameUtils, YGOPlayerState } from "ygo-core";

export function GlobalEventsActionsMenu({
  duel,
  transform,
}: {
  duel: YGODuel;
  transform: THREE.Mesh;
}) {
  const menuRef = useRef<HTMLDivElement>();
  const player = duel.getActivePlayer();
  const timer = useRef<number>(-1);
  const field = duel.ygo.state.fields[player];

  const destroyAllCards = useCallback(() => {
    duel.gameActions.destroyAllCards({ zone: "all" });
  }, []);

  const newRandomPlayerHand = useCallback(() => {
    duel.gameActions.swapPlayerHand({ player });
  }, [player]);


  const shuffleHand = useCallback(() => {
    duel.gameActions.shuffleHand({ player });
  }, [player]);

  const newNote = useCallback(() => {
    const action = new ActionUiMenu(duel, {
      eventType: "duel-notes-form-menu",
      eventData: { duel }
    });
    duel.actionManager.clearAction();
    timer.current = setTimeout(() => duel.actionManager.setAction(action)) as unknown as number;
  }, [])

  const ripCardFromHandRandom = useCallback(() => {
    const hand = duel.ygo.getField(1 - player).hand;

    if (hand.length === 0) return;

    const cardIndex = Math.floor(Math.random() * hand.length);

    duel.gameActions.sendToGy({
      player,
      card: hand[cardIndex],
      originZone: YGOGameUtils.createZone("H", 1 - player, cardIndex + 1)
    });
  }, [player]);

  const banishExtraDeckRandomFaceDown = useCallback(() => {
    duel.clearActions();

    const numberOfCardsStr = prompt("Choose a number of cards to banish from Extra Deck");

    if (!numberOfCardsStr) return;
    if (isNaN(Number(numberOfCardsStr))) return;

    const numberOfCards = Number(numberOfCardsStr);

    if (numberOfCards < 1 || numberOfCards > field.extraDeck.length) return;

    const extra = [...field.extraDeck];
    if (extra.length === 0) return;

    for (let i = extra.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [extra[i], extra[j]] = [extra[j], extra[i]];
    }

    const selected = extra.slice(0, numberOfCards);

    const cards = selected.map((card) => ({
      card,
      zone: YGOGameUtils.createZone("ED", player, field.extraDeck.indexOf(card) + 1),
    }));

    duel.gameActions.banishMultiple({ cards, position: "facedown" });
  }, [player, field?.extraDeck?.length, duel]);

  const diceRoll = useCallback(() => {

    duel.gameActions.diceRoll({ player });

    // const action = new ActionUiMenu(duel, {
    //   eventType: "dice-roll-menu",
    //   eventData: { duel }
    // });
    // duel.actionManager.clearAction();
    // timer.current = setTimeout(() => duel.actionManager.setAction(action)) as unknown as number;
  }, [])

  const admitDefeat = useCallback(() => {
    duel.gameActions.admitDefeat({ player });
  }, [player]);

  const flipCoin = useCallback(() => {

    duel.gameActions.flipCoin({ player });

    // const action = new ActionUiMenu(duel, {
    //   eventType: "flip-coin-menu",
    //   eventData: { duel }
    // });
    // duel.actionManager.clearAction();
    // timer.current = setTimeout(() => duel.actionManager.setAction(action)) as unknown as number;
  }, [])

  const toggleThinking = () => {

    const state = duel.ygo.getField(player)?.state;

    if (state === YGOPlayerState.THINKING) {
      duel.gameActions.setPlayerState({
        player,
        state: YGOPlayerState.IDLE
      })
    } else {
      duel.gameActions.setPlayerState({
        player,
        state: YGOPlayerState.THINKING
      })
    }
  }

  useEffect(() => {
    return () => {
      clearTimeout(timer.current);
    }
  }, [])

  useLayoutEffect(() => {
    const container = menuRef.current!;
    const size = container.getBoundingClientRect();
    const { x, y, width } = getTransformFromCamera(duel, transform);
    container.style.top = Math.max(0, y - size.height) + "px";
    container.style.left = x - size.width / 2 + width / 2 + "px";
  }, [transform]);

  const freeMonsterZones = field.monsterZone.filter((zone: any) => !zone).length;

  return (
    <CardMenu key="global-events-actions-menu" cols={2} indicator menuRef={menuRef}>
      <button type="button" className="ygo-card-item" onClick={newNote}>
        Add Notes
      </button>
      <button
        className="ygo-card-item"
        disabled={freeMonsterZones === 0}
        type="button"
        onClick={() => duel.gameActions.createToken({ position: "faceup-attack" })}
      >
        Create Token ATK
      </button>
      <button
        className="ygo-card-item"
        disabled={freeMonsterZones === 0}
        type="button"
        onClick={() => duel.gameActions.createToken()}
      >
        Create Token DEF
      </button>
      <button type="button" className="ygo-card-item" onClick={destroyAllCards}>
        Destroy all Cards
      </button>
      <button type="button" className="ygo-card-item" onClick={newRandomPlayerHand}>
        New Random Hand
      </button>
      <button type="button" className="ygo-card-item" onClick={toggleThinking}>
        Toggle Thinking
      </button>
      <button type="button" className="ygo-card-item" onClick={shuffleHand}>
        Shuffle Hand
      </button>

      <button type="button" className="ygo-card-item" onClick={diceRoll}>
        Roll dice
      </button>

      <button type="button" className="ygo-card-item" onClick={flipCoin}>
        Flip Coin
      </button>

      <button type="button" className="ygo-card-item" onClick={admitDefeat}>
        Admit Defeat
      </button>

      <button type="button" className="ygo-card-item" onClick={ripCardFromHandRandom}>
        Rip Card From Hand Random
      </button>
      <button type="button" className="ygo-card-item" onClick={banishExtraDeckRandomFaceDown}>Banish FD Random From Extra Deck</button>
    </CardMenu>
  );
}
