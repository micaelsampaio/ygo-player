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
    duel.gameActions.toDeck({ card, originZone: zone, position: "bottom" });
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

  const changeCardStats = useCallback(() => {
    duel.events.dispatch("set-ui-action", { type: "card-stats-dialog-menu", data: { player, card, originZone: zone } });
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
  const isPendulum = YGOGameUtils.isPendulumCard(card);
  const isXYZ = YGOGameUtils.isXYZMonster(card);
  const isFaceUp = YGOGameUtils.isFaceUp(card);
  const isLink = YGOGameUtils.isLinkMonster(card);
  const isMonsterZone = zoneData.zone === "M" || zoneData.zone === "EMZ";
  const isMainDeckCard = card.isMainDeckCard;
  const isAttack = YGOGameUtils.isAttack(card);
  const isSpellTrap = YGOGameUtils.isSpellTrap(card);
  const xyzMonstersInFieldCounter = YGOGameUtils.XyzMonstersInFieldsCounter(duel.ygo);
  const canAttachMaterial = (isXYZ && xyzMonstersInFieldCounter > 1) || (!isXYZ && xyzMonstersInFieldCounter > 0);

  // TOKEN MENU
  if (isToken) {
    return <CardMenu indicator menuRef={menuRef}>

      <button type="button" className="ygo-card-item" onClick={moveCard}>
        Move
      </button>

      <button type="button" className="ygo-card-item" onClick={targetCard}>
        Target
      </button>

      <button type="button" className="ygo-card-item" onClick={changeCardStats}>Change Card Stats</button>

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

      <button
        type="button"
        className="ygo-card-item"
        onClick={removeToken}
      >
        Remove
      </button>
    </CardMenu>
  }

  if (!isMonsterZone && isSpellTrap) {
    return (
      <CardMenu cols indicator menuRef={menuRef}>

        <button type="button" className="ygo-card-item" onClick={moveCard}>
          Move
        </button>

        <button className="ygo-card-item" onClick={negateCard}>Negate</button>

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

        <button type="button" className="ygo-card-item" onClick={banishFD}>
          Banish FD
        </button>

        <button type="button" className="ygo-card-item" onClick={banish}>
          Banish
        </button>

        <button type="button" className="ygo-card-item" onClick={toHand}>
          To Hand
        </button>

        {isFaceUp && (
          <>
            <button type="button" className="ygo-card-item" onClick={setCard}>
              Set
            </button>
          </>
        )}

        <button type="button" className="ygo-card-item" onClick={sendToGY}>
          To Grave
        </button>

        <button type="button" className="ygo-card-item" onClick={activateCard}>
          Activate
        </button>
      </CardMenu>)
  }

  // CARD MENU
  return (
    <CardMenu cols indicator menuRef={menuRef}>
      <button type="button" className="ygo-card-item" onClick={moveCard}>
        Move
      </button>

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

      {canAttachMaterial && (
        <>
          <button
            type="button"
            className="ygo-card-item"
            onClick={attachMaterial}
          >
            Attach Material to XYZ
          </button>
        </>
      )}

      <button type="button" className="ygo-card-item" onClick={targetCard}>
        Target
      </button>

      <button type="button" className="ygo-card-item" onClick={changeCardStats}>Change Card Stats</button>


      <button type="button" className="ygo-card-item" onClick={toBottomDeck}>
        To Bottom Deck
      </button>

      <button type="button" className="ygo-card-item" onClick={toTopDeck}>
        To Top Deck
      </button>

      <button type="button" className="ygo-card-item" onClick={banishFD}>
        Banish FD
      </button>

      <button type="button" className="ygo-card-item" onClick={banish}>
        Banish
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

      <button type="button" className="ygo-card-item" onClick={destroyCard}>
        Destroy
      </button>

      {!isLink && (
        <>
          {!isFaceUp && (
            <>
              <button type="button" className="ygo-card-item" onClick={flip}>
                Flip
              </button>
            </>
          )}

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
                  To ATK
                </button>
              )}
              {isAttack && (
                <button
                  type="button"
                  className="ygo-card-item"
                  onClick={changeBattleToDEF}
                >
                  To DEF
                </button>
              )}
            </>
          )}

        </>
      )}

      {isPendulum && <>
        <button type="button" className="ygo-card-item" onClick={toExtraDeck}>
          To Extra Deck
        </button>
      </>}

      <button type="button" className="ygo-card-item" onClick={sendToGY}>
        Send To GY
      </button>

      {isFaceUp && (
        <button type="button" className="ygo-card-item" onClick={activateCard}>
          Activate
        </button>
      )}
    </CardMenu>
  );
}
