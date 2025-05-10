import styled, { css, keyframes } from "styled-components";
import { usePreDuelLobbyContext } from "./context";
import { Card, FieldZone, YGOGameUtils } from "ygo-core";
import { getCardImageUrl } from "../../../utils/cardImages";

export function PreGameBoard() {

  const { action, players, clearAction, setCardInCardZone } = usePreDuelLobbyContext();

  const isCardSelectionActive = action?.name === "select_card_zone";


  const onCardZoneClick = (zone: FieldZone) => {
    if (action?.data?.card) {
      setCardInCardZone(zone, action?.data.card);
    }

    clearAction();
  }

  const renderZone = (playerIndex: number, fieldZone: string, zoneIndex: number, card: Card | null) => {
    const zone = YGOGameUtils.createZone(fieldZone as any, playerIndex, zoneIndex);
    return <div
      ygo-zone={zone}
      key={zone}
      onClick={() => onCardZoneClick(zone)}
      className={`relative`}
    >
      <CardZone
        className="h-[90%] aspect-[0.714] border-2 border-dotted border-gray-500/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        blink={isCardSelectionActive && (action?.data?.player === playerIndex || playerIndex === -1)}>
      </CardZone>

      {
        card && (
          <div className={`absolute top-1/2 left-1/2 h-[80%] aspect-[0.714] -translate-x-1/2 -translate-y-1/2 ${playerIndex === 1 ? "rotate-180" : ""}`}>
            <img src={getCardImageUrl(card.id)} className="w-full h-full" />
          </div>
        )
      }

    </div>
  }

  return (
    <div className="w-full h-full max-h-full bg-gray-900 flex items-center justify-center text-white">
      <div className="w-full max-w-[90vmin] aspect-square p-2">
        <div className="grid h-full w-full grid-rows-7 grid-cols-7">
          <div className="col-span-7 flex py-4">
            <div className="w-full h-full border-2 border-dotted border-gray-500/50 flex items-center justify-center gap-4" onClick={() => onCardZoneClick("H2")}>
              {players[1].field.hand.map((card) => <img src={getCardImageUrl(card!.id)} className="h-[80%] aspect-[0.714]" />)}
            </div>
          </div>

          <div className="col-span-1" />
          {players[1].field.spellZones.map((card, zoneIndex) => renderZone(1, "S", zoneIndex + 1, card))}
          <div className="col-span-1" />
          <div className="col-span-1" />
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
          <div className="flex align-middle justify-center">
            <div className="aspect-square w-3/4 m-auto rounded-full border-2 border-gray-500/50 border-dotted">
              B
            </div>
          </div>
          <div className="col-span-1" />
          {players[0].field.spellZones.map((card, zoneIndex) => renderZone(0, "S", zoneIndex + 1, card))}
          <div className="flex align-middle justify-center">
            <div className="aspect-square w-3/4 m-auto rounded-full border-2 border-gray-500/50 border-dotted" >
              GY
            </div>
          </div>

          {/* Bottom Row */}
          <div className="col-span-7 flex py-4">
            <div className="w-full h-full border-2 border-dotted border-gray-500/50 flex items-center justify-center gap-4" onClick={() => onCardZoneClick("H")}>
              {players[0].field.hand.map((card) => <img src={getCardImageUrl(card!.id)} className="h-[80%] aspect-[0.714]" />)}
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