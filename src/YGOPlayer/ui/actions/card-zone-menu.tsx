import { useCallback, useLayoutEffect, useRef } from "react";
import { YGOGameUtils } from "ygo-core";
import { Card, FieldZone } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import {
  getTransformFromCamera,
  getXyzMonstersZones,
} from "../../scripts/ygo-utils";
import { CardMenu } from "../components/CardMenu";
import { GameCard } from "../../game/GameCard";

export function CardZoneMenu({
  duel,
  card,
  zone,
  gameCard,
  clearAction,
  mouseEvent,
}: {
  duel: YGODuel;
  gameCard: GameCard;
  zone: FieldZone;
  card: Card;
  clearAction: Function;
  mouseEvent: React.MouseEvent;
}) {
  const menuRef = useRef<HTMLDivElement>();
  const player = duel.getActivePlayer();

  const sendToGY = useCallback(() => {
    duel.gameActions.sendToGy({ card, originZone: zone });
  }, [card, zone]);

  const banish = useCallback(() => {
    duel.gameActions.banish({ card, originZone: zone, position: "faceup" });
  }, [card, zone]);

  const banishFD = useCallback(() => {
    duel.gameActions.banish({ card, originZone: zone, position: "facedown" });
  }, [card, zone]);

  const toHand = useCallback(() => {
    duel.gameActions.toHand({ card, originZone: zone });
  }, [card, zone]);

  const toExtraDeck = useCallback(() => {
    duel.gameActions.toExtraDeck({ card, originZone: zone });
  }, [card, zone]);

  const toTopDeck = useCallback(() => {
    duel.gameActions.toDeck({ card, originZone: zone, position: "top" });
  }, [card, zone]);

  const toBottomDeck = useCallback(() => {
    duel.gameActions.toDeck({ card, originZone: zone, position: "top" });
  }, [card, zone]);

  const setCard = useCallback(() => {
    duel.gameActions.setCard({ card, originZone: zone, selectZone: false });
  }, [card, zone]);

  const flip = useCallback(() => {
    duel.gameActions.flip({ card, originZone: zone });
  }, [card, zone]);

  const changeBattleToATK = useCallback(() => {
    duel.gameActions.changeBattlePosition({
      card,
      originZone: zone,
      position: "faceup-attack",
    });
  }, [card, zone]);

  const changeBattleToDEF = useCallback(() => {
    duel.gameActions.changeBattlePosition({
      card,
      originZone: zone,
      position: "faceup-defense",
    });
  }, [card, zone]);

  const viewMaterials = () => {
    duel.events.dispatch("toggle-ui-menu", {
      group: "game-overlay",
      autoClose: true,
      type: "xyz-monster-materials",
      data: { card, zone },
    });
  };

  const attachMaterial = useCallback(() => {
    duel.gameActions.attachMaterial({ card, originZone: zone });
  }, [card, zone]);

  const activateCard = useCallback(() => {
    duel.gameActions.activateCard({
      card,
      originZone: zone,
      selectZone: false,
    });
  }, [card, zone]);

  const moveCard = useCallback(() => {
    duel.gameActions.moveCard({ card, originZone: zone });
  }, [card, zone]);

  const changeAtkDef = useCallback(() => {
    duel.gameActions.changeAtkDef({ card, originZone: zone, prompt: true });
  }, [card, zone]);

  const changeCardStats = useCallback(() => {
    duel.events.dispatch("set-ui-action", { type: "card-stats-dialog-menu", data: { player, card, originZone: zone } });
  }, [card, zone]);

  const changeCardLevel = useCallback(() => {
    duel.gameActions.changeCardLevel({ card, originZone: zone });
  }, [card, zone]);

  const destroyCard = useCallback(() => {
    duel.gameActions.destroyCard({ card, originZone: zone });
  }, [card, zone]);

  const targetCard = useCallback(() => {
    duel.gameActions.targetCard({ card, originZone: zone });
  }, [card, zone]);

  const removeToken = useCallback(() => {
    duel.gameActions.disapear({ card, originZone: zone });
  }, [card, zone]);

  const negateCard = useCallback(() => {
    duel.gameActions.negateCard({ card, originZone: zone });
  }, [card, zone]);

  useLayoutEffect(() => {
    const container = menuRef.current!;
    const size = container.getBoundingClientRect();
    const { x, y, width, height } = getTransformFromCamera(
      duel,
      gameCard.gameObject
    );
    container.style.top = Math.max(0, y - size.height) + "px";
    container.style.left = x - size.width / 2 + width / 2 + "px";
  }, [card]);
  const zoneData = YGOGameUtils.getZoneData(zone);
  const field = duel.ygo.state.fields[player];
  const isToken = YGOGameUtils.isToken(card);
  const isXYZ = YGOGameUtils.isXYZMonster(card);
  const isFaceUp = YGOGameUtils.isFaceUp(card);
  const isLink = YGOGameUtils.isLinkMonster(card);
  const isMonsterZone = zoneData.zone === "M" || zoneData.zone === "EMZ";
  const isMonster = YGOGameUtils.isMonster(card);
  const isMainDeckCard = card.isMainDeckCard;
  const isAttack = YGOGameUtils.isAttack(card);
  const isSpellTrap = YGOGameUtils.isSpellTrap(card);
  const xyzMonstersInFieldCounter = YGOGameUtils.XyzMonstersInFieldsCounter(duel.ygo);
  const canAttachMaterial = (isXYZ && xyzMonstersInFieldCounter > 1) || (!isXYZ && xyzMonstersInFieldCounter > 0);

  // TOKEN MENU
  if (isToken) {
    return <CardMenu menuRef={menuRef}>
      <button
        type="button"
        className="ygo-card-item"
        onClick={changeAtkDef}
      >
        Change Atk Def
      </button>

      {!isAttack && (
        <button
          type="button"
          className="ygo-card-item"
          onClick={changeBattleToATK}
        >
          TO ATK
        </button>
      )}

      {isAttack && (
        <button
          type="button"
          className="ygo-card-item"
          onClick={changeBattleToDEF}
        >
          TO DEF
        </button>
      )}

      <button type="button" className="ygo-card-item" onClick={moveCard}>
        Move
      </button>

      <button
        type="button"
        className="ygo-card-item"
        onClick={removeToken}
      >
        Remove
      </button>
    </CardMenu>
  }

  // CARD MENU
  return (
    <CardMenu menuRef={menuRef}>
      <button onClick={changeCardStats}>Change Card Stats</button>

      <button className="ygo-card-item" onClick={negateCard}>Negate</button>

      {isXYZ && (
        <>
          <button
            type="button"
            className="ygo-card-item"
            onClick={viewMaterials}
          >
            View Materials
          </button>
        </>
      )}

      {isMonsterZone && (
        <>
          <button
            type="button"
            className="ygo-card-item"
            onClick={changeAtkDef}
          >
            Change Atk Def
          </button>

          <button
            type="button"
            className="ygo-card-item"
            onClick={changeCardLevel}
          >
            Change Level
          </button>
        </>
      )}

      <button type="button" className="ygo-card-item" onClick={moveCard}>
        Move
      </button>
      <button type="button" className="ygo-card-item" onClick={destroyCard}>
        Destroy
      </button>

      <button type="button" className="ygo-card-item" onClick={targetCard}>
        Target
      </button>
      <button type="button" className="ygo-card-item" onClick={toBottomDeck}>
        To Bottom Deck
      </button>
      <button type="button" className="ygo-card-item" onClick={toTopDeck}>
        To Top. Deck
      </button>

      <button type="button" className="ygo-card-item" onClick={banish}>
        Banish
      </button>

      <button type="button" className="ygo-card-item" onClick={banishFD}>
        Banish FD
      </button>

      {isMainDeckCard && (
        <button type="button" className="ygo-card-item" onClick={toHand}>
          To Hand
        </button>
      )}

      {!isMainDeckCard && (
        <button type="button" className="ygo-card-item" onClick={toExtraDeck}>
          To Extra Deck
        </button>
      )}

      {isMonsterZone && isMonster && !isLink && (
        <>
          {isFaceUp && (
            <>
              <button type="button" className="ygo-card-item" onClick={setCard}>
                Set
              </button>
              {!isAttack && (
                <button
                  type="button"
                  className="ygo-card-item"
                  onClick={changeBattleToATK}
                >
                  TO ATK
                </button>
              )}
              {isAttack && (
                <button
                  type="button"
                  className="ygo-card-item"
                  onClick={changeBattleToDEF}
                >
                  TO DEF
                </button>
              )}
            </>
          )}
          {!isFaceUp && (
            <>
              <button type="button" className="ygo-card-item" onClick={flip}>
                Flip
              </button>
            </>
          )}
        </>
      )}

      {isSpellTrap && isFaceUp && (
        <>
          <button type="button" className="ygo-card-item" onClick={setCard}>
            Set
          </button>
        </>
      )}

      {(isMonster && isFaceUp) ||
        (isSpellTrap && (
          <button
            type="button"
            className="ygo-card-item"
            onClick={activateCard}
          >
            Activate
          </button>
        ))}

      <button type="button" className="ygo-card-item" onClick={sendToGY}>
        Send To GY
      </button>

      {canAttachMaterial && (
        <>
          <button
            type="button"
            className="ygo-card-item"
            onClick={attachMaterial}
          >
            Attach Material
          </button>
        </>
      )}

      {isFaceUp && (
        <button type="button" className="ygo-card-item" onClick={activateCard}>
          Activate
        </button>
      )}
    </CardMenu>
  );
}
