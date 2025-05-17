import styled, { css, keyframes } from "styled-components";
import { usePreDuelLobbyContext } from "./context";
import { Card, FieldZone, YGOGameUtils } from "ygo-core";
import { getCardImageUrl } from "../../../utils/cardImages";
import { PRE_GAME_ACTIONS_TYPES } from "../actions";
const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL);

const FACE_DOWN_CARD_URL = `${cdnUrl}/images/card_back.png`;

export function PreGameBoard() {

  const { action, players, setAction, clearAction, setCardInCardZone } = usePreDuelLobbyContext();

  const isCardSelectionActive = action?.name === "select_card_zone";

  const onCardZoneClick = (zone: FieldZone, card: Card | null) => {

    if (!action && card) {
      setAction({
        name: PRE_GAME_ACTIONS_TYPES.update_card_zone,
        data: {
          card,
          zoneData: YGOGameUtils.getZoneData(zone)
        }
      });

      return;
    }

    if (action?.data?.card) {
      setCardInCardZone(zone, action?.data.card);
    }

    clearAction();
  }

  const onCardZoneRightClick = (e: any, zone: FieldZone) => {
    e.preventDefault();
    e.stopPropagation();
    setCardInCardZone(zone, null);
    clearAction();
  }

  const renderZone = (playerIndex: number, fieldZone: string, zoneIndex: number, card: Card | null) => {
    const zone = YGOGameUtils.createZone(fieldZone as any, playerIndex, zoneIndex);

    const isDefense = !!(card && !fieldZone.startsWith("S") && YGOGameUtils.isDefense(card));
    const rotationClass = getCardRotation(playerIndex, isDefense);
    const hasFacedownCard = card && YGOGameUtils.isFaceDown(card);

    return <CardZoneContainer
      ygo-zone={zone}
      key={zone}
      onClick={() => onCardZoneClick(zone, card)}
      onContextMenu={(e) => onCardZoneRightClick(e, zone)}
    >
      <CardZone
        className={`h-[90%] aspect-[0.714] border-2 border-dotted border-${playerIndex === 0 ? "blue" : playerIndex === 1 ? "red" : "gray"}-500/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`}
        blink={isCardSelectionActive && (action?.data?.player === playerIndex || playerIndex === -1)}>

      </CardZone>

      {
        card && (
          <div className={`absolute top-1/2 left-1/2 h-[80%] aspect-[0.714] -translate-x-1/2 -translate-y-1/2 ${rotationClass}`}>
            <img src={getCardImageUrl(card.id)} className="w-full h-full" />

            {
              hasFacedownCard && <img className="absolute bg-black/50 top-0 left-0 w-full h-full opacity-70 card-face-down" src={FACE_DOWN_CARD_URL} />
            }
          </div>
        )
      }
    </CardZoneContainer>
  }

  return (
    <div className="w-full h-full max-h-full bg-gray-900 flex items-center justify-center text-white">
      <div className="w-full max-w-[90vmin] aspect-square p-2">
        <div className="grid h-full w-full grid-rows-7 grid-cols-7">
          <div className="col-span-7 flex py-4">
            <div className="w-full h-full border-2 border-dotted border-red-500/50 flex items-center justify-center gap-4" onClick={() => onCardZoneClick("H2", null)}>
              {players[1].field.hand.map((card) => <img src={getCardImageUrl(card!.id)} className="h-[80%] aspect-[0.714]" />)}
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div
              className="aspect-square w-3/4 m-auto rounded-full border-2 border-red-500/50 border-dotted flex items-center justify-center"
              onClick={() => onCardZoneClick("GY2", null)}
            >
              GY ({players[0].field.graveyard.length})
            </div>
          </div>
          {players[1].field.spellZones.map((card, zoneIndex) => renderZone(1, "S", zoneIndex + 1, card))}
          <div className="col-span-1" />
          <div className="flex items-center justify-center">
            <div
              className="aspect-square w-3/4 m-auto rounded-full border-2 border-red-500/50 border-dotted flex items-center justify-center"
              onClick={() => onCardZoneClick("B2", null)}
            >
              B ({players[0].field.banishedZone.length})
            </div>
          </div>
          {players[1].field.monsterZones.map((card, zoneIndex) => renderZone(1, "M", zoneIndex + 1, card))}
          {renderZone(1, "F", -1, players[1].field.fieldSpell)}

          <div className="col-span-2" />
          {players[0].field.extraMonsterZones[0] && renderZone(0, "EMZ", 1, players[0].field.extraMonsterZones[0])}
          {players[1].field.extraMonsterZones[0] && renderZone(1, "EMZ", 1, players[1].field.extraMonsterZones[0])}
          {!players[0].field.extraMonsterZones[0] && !players[1].field.extraMonsterZones[0] && renderZone(action?.data?.card?.originalOwner ?? -1, "EMZ", 1, null)}

          <div className="col-span-1" />
          {players[0].field.extraMonsterZones[1] && renderZone(0, "EMZ", 2, players[0].field.extraMonsterZones[1])}
          {players[1].field.extraMonsterZones[1] && renderZone(1, "EMZ", 2, players[1].field.extraMonsterZones[1])}
          {!players[0].field.extraMonsterZones[1] && !players[1].field.extraMonsterZones[1] && renderZone(action?.data?.card?.originalOwner ?? -1, "EMZ", 2, null)}

          <div className="col-span-2" />

          {renderZone(0, "F", -1, players[0].field.fieldSpell)}
          {players[0].field.monsterZones.map((card, zoneIndex) => renderZone(0, "M", zoneIndex + 1, card))}
          <div className="flex items-center justify-center">
            <div
              className="aspect-square w-3/4 m-auto rounded-full border-2 border-blue-500/50 border-dotted flex items-center justify-center"
              onClick={() => onCardZoneClick("B", null)}
            >
              B ({players[0].field.banishedZone.length})
            </div>
          </div>
          <div className="col-span-1" />
          {players[0].field.spellZones.map((card, zoneIndex) => renderZone(0, "S", zoneIndex + 1, card))}
          <div className="flex items-center justify-center">
            <div
              className="aspect-square w-3/4 m-auto rounded-full border-2 border-blue-500/50 border-dotted flex items-center justify-center"
              onClick={() => onCardZoneClick("GY", null)}
            >
              GY ({players[0].field.graveyard.length})
            </div>
          </div>

          {/* Bottom Row */}
          <div className="col-span-7 flex py-4">
            <div className="w-full h-full border-2 border-dotted border-blue-500/50 flex items-center justify-center gap-4" onClick={() => onCardZoneClick("H", null)}>
              {players[0].field.hand.map((card, cardIndex) => <img
                src={getCardImageUrl(card!.id)}
                className="h-[80%] aspect-[0.714]"
                onContextMenu={(e) => onCardZoneRightClick(e, YGOGameUtils.createZone("H", 0, cardIndex + 1))} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


const blinkAnimation = keyframes`
  0%, 100% {
    opacity: 0.2;
  }
  50% {
    opacity: 1;
  }
`;

const CardZone = styled.div<{ blink: boolean }>`
  ${({ blink }) =>
    blink && css`
    animation: ${blinkAnimation} 1s ease-in-out infinite;
  `}
`;

function getCardRotation(playerIndex: number, isDefense: boolean) {
  if (playerIndex === 1) {
    if (isDefense) {
      return "rotate-90";
    }
    return "rotate-180";
  }

  if (isDefense) {
    return "-rotate-90"
  }

  return "";

}

const CardZoneContainer = styled.div`
  position: relative;
  &:hover .card-face-down {
    opacity: 0.3;
  }
`