import { useCallback, useLayoutEffect, useRef } from "react";
import { YGODuel } from "../../core/YGODuel";
import { getTransformFromCamera, } from "../../scripts/ygo-utils";
import { CardMenu } from "../components/CardMenu";
import * as THREE from "three";
import { ActionUiMenu } from "../../actions/ActionUiMenu";

export function GlobalEventsActionsMenu({
  duel,
  transform,
}: {
  duel: YGODuel;
  transform: THREE.Mesh;
}) {
  const menuRef = useRef<HTMLDivElement>();
  const player = duel.getActivePlayer();

  const destroyAllCards = useCallback(() => {
    duel.gameActions.destroyAllCards({ zone: "all" });
  }, []);

  const newRandomPlayerHand = useCallback(() => {
    duel.gameActions.swapPlayerHand({ player });
  }, [player]);

  const newNote = useCallback(() => {
    const action = new ActionUiMenu(duel, {
      eventType: "duel-notes-form-menu",
      eventData: { duel }
    });
    duel.actionManager.clearAction();
    setTimeout(() => duel.actionManager.setAction(action))
  }, [])

  useLayoutEffect(() => {
    const container = menuRef.current!;
    const size = container.getBoundingClientRect();
    const { x, y, width } = getTransformFromCamera(duel, transform);
    container.style.top = Math.max(0, y - size.height) + "px";
    container.style.left = x - size.width / 2 + width / 2 + "px";
  }, [transform]);

  const field = duel.ygo.state.fields[player];
  const freeMonsterZones = field.monsterZone.filter((zone: any) => !zone).length;

  return (
    <CardMenu key="global-events-actions-menu" menuRef={menuRef}>
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
    </CardMenu>
  );
}
