import * as THREE from "three";
import { useCallback, useLayoutEffect, useRef } from "react";
import { YGODuel } from "../../core/YGODuel";
import { getTransformFromCamera, } from "../../scripts/ygo-utils";
import { CardMenu } from "../components/CardMenu";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { YGOGameUtils } from "ygo-core";

export function GlobalEventsActionsMenu({
  duel,
  transform,
}: {
  duel: YGODuel;
  transform: THREE.Mesh;
}) {
  const menuRef = useRef<HTMLDivElement>();
  const player = duel.serverActions.getActivePlayer();
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

  const showHand = useCallback(() => {
    duel.gameActions.showHand({ player });
  }, [player]);

  const newNote = useCallback(() => {
    const action = new ActionUiMenu(duel, {
      eventType: "duel-notes-form-menu",
      eventData: { duel }
    });
    duel.actionManager.clearAction();
    duel.actionManager.setAction(action);
  }, [])

  const ripCardFromHandRandom = useCallback(() => {
    const hand = duel.ygo.getField(player).hand;

    if (hand.length === 0) return;

    const cardIndex = Math.floor(Math.random() * hand.length);

    duel.gameActions.sendToGy({
      player,
      card: hand[cardIndex],
      originZone: YGOGameUtils.createZone("H", player, cardIndex + 1)
    });
  }, [player]);

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

  useLayoutEffect(() => {
    const container = menuRef.current!;
    const size = container.getBoundingClientRect();
    const { x, y, width } = getTransformFromCamera(duel, transform);

    const top = Math.max(0, y - size.height);
    const left = x - size.width / 2 + width / 2;

    const clampedTop = Math.min(top, window.innerHeight - size.height);
    const clampedLeft = Math.max(0, Math.min(left, window.innerWidth - size.width));

    container.style.top = clampedTop + "px";
    container.style.left = clampedLeft + "px";
  }, [transform]);

  const freeMonsterZones = field.monsterZone.filter((zone: any) => !zone).length;

  return (
    <CardMenu key="global-events-actions-menu" cols={2} menuRef={menuRef}>
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
      <button type="button" className="ygo-card-item" onClick={shuffleHand}>
        Shuffle Hand
      </button>
      <button type="button" className="ygo-card-item" onClick={showHand}>
        Reveal Hand
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
        Random Handrip
      </button>
    </CardMenu>
  );
}
