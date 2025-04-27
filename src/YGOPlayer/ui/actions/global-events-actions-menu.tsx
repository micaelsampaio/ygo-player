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
import * as THREE from "three";

export function GlobalEventsActionsMenu({
  duel,
  transform,
}: {
  duel: YGODuel;
  transform: THREE.Mesh;
}) {
  const menuRef = useRef<HTMLDivElement>();
  const player = duel.getActivePlayer();

  // const sendToGY = useCallback(() => {
  //   duel.gameActions.sendToGy({ card, originZone: zone });
  // }, [card, zone]);

  // const banish = useCallback(() => {
  //   duel.gameActions.banish({ card, originZone: zone, position: "faceup" });
  // }, [card, zone]);

  // const banishFD = useCallback(() => {
  //   duel.gameActions.banish({ card, originZone: zone, position: "facedown" });
  // }, [card, zone]);

  // const toHand = useCallback(() => {
  //   duel.gameActions.toHand({ card, originZone: zone });
  // }, [card, zone]);

  // const toExtraDeck = useCallback(() => {
  //   duel.gameActions.toExtraDeck({ card, originZone: zone });
  // }, [card, zone]);

  // const toTopDeck = useCallback(() => {
  //   duel.gameActions.toDeck({ card, originZone: zone, position: "top" });
  // }, [card, zone]);

  // const toBottomDeck = useCallback(() => {
  //   duel.gameActions.toDeck({ card, originZone: zone, position: "bottom" });
  // }, [card, zone]);

  // const setCard = useCallback(() => {
  //   duel.gameActions.setCard({ card, originZone: zone, selectZone: false });
  // }, [card, zone]);

  // const flip = useCallback(() => {
  //   duel.gameActions.flip({ card, originZone: zone });
  // }, [card, zone]);

  // const changeBattleToATK = useCallback(() => {
  //   duel.gameActions.changeBattlePosition({
  //     card,
  //     originZone: zone,
  //     position: "faceup-attack",
  //   });
  // }, [card, zone]);

  // const changeBattleToDEF = useCallback(() => {
  //   duel.gameActions.changeBattlePosition({
  //     card,
  //     originZone: zone,
  //     position: "faceup-defense",
  //   });
  // }, [card, zone]);

  // const viewMaterials = () => {
  //   duel.events.dispatch("toggle-ui-menu", {
  //     group: "game-overlay",
  //     autoClose: true,
  //     type: "xyz-monster-materials",
  //     data: { card, zone },
  //   });
  // };

  // const attachMaterial = useCallback(() => {
  //   duel.gameActions.attachMaterial({ card, originZone: zone });
  // }, [card, zone]);

  // const activateCard = useCallback(() => {
  //   duel.gameActions.activateCard({
  //     card,
  //     originZone: zone,
  //     selectZone: false,
  //   });
  // }, [card, zone]);

  // const moveCard = useCallback(() => {
  //   duel.gameActions.moveCard({ card, originZone: zone });
  // }, [card, zone]);

  // const changeCardStats = useCallback(() => {
  //   duel.events.dispatch("set-ui-action", { type: "card-stats-dialog-menu", data: { player, card, originZone: zone } });
  // }, [card, zone]);

  // const destroyCard = useCallback(() => {
  //   duel.gameActions.destroyCard({ card, originZone: zone });
  // }, [card, zone]);

  // const targetCard = useCallback(() => {
  //   duel.gameActions.targetCard({ card, originZone: zone });
  // }, [card, zone]);

  // const removeToken = useCallback(() => {
  //   duel.gameActions.disapear({ card, originZone: zone });
  // }, [card, zone]);

  const destroyAllCards = useCallback(() => {
    duel.gameActions.destroyAllCards({ zone: "all" });
  }, []);

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
    </CardMenu>
  );
}
