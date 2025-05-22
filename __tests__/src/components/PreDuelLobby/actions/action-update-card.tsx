import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/lib/components/ui/dialog";
import { Card, CardPosition, FieldZoneData, YGOGameUtils } from "ygo-core";
import { usePreDuelLobbyContext } from "../components/context";
import { useEffect, useMemo, useState } from "react";
import { getCardImageUrl } from "@/utils/cardImages";
// @ts-ignore
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/lib/components/ui/select";
// @ts-ignore
import { Button } from "@/lib/components/ui/button";

interface PositionItem {
  value: CardPosition
  description: string,
}

export function ActionUpdateCardDetails({
  card,
  zoneData
}: {
  card: Card,
  zoneData: FieldZoneData
}) {
  const [open, setOpen] = useState(true);

  const { setPlayers, clearAction, updateFieldCards } = usePreDuelLobbyContext();

  const cardData = useMemo(() => {

    const positions = getCardPositions(zoneData, card);

    return {
      positions
    }
  }, [card]);

  const handleChangePosition = (cardPosition: string) => {
    card.position = cardPosition as any;
    updateFieldCards();
  }

  const returnCardToDeck = () => {
    if (!open) return;

    setPlayers((players) => players.map((player, playerIndex) => {
      if (card.originalOwner === playerIndex) {
        card.position = "faceup-attack";

        if (YGOGameUtils.isPendulumCard(card)) {
          player.extraDeck = [...player.extraDeck, card];
        } else {
          player.mainDeck = [...player.mainDeck, card];
        }

        player.field.hand = player.field.hand.filter(c => c != card);
        player.field.monsterZones = player.field.monsterZones.map((c) => {
          if (c === card) return null;
          return c;
        });
        player.field.spellZones = player.field.spellZones.map((c) => {
          if (c === card) return null;
          return c;
        });
        player.field.extraMonsterZones = player.field.extraMonsterZones.map((c) => {
          if (c === card) return null;
          return c;
        });
        player.field.graveyard = player.field.graveyard.filter(c => c != card);
        player.field.banishedZone = player.field.banishedZone.filter(c => c != card);

        return { ...player }
      }

      return player;
    }));

    setOpen(false);
  }

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        clearAction();
      }, 500);
      return () => {
        clearTimeout(timer);
      }
    }

  }, [open])

  return <Dialog open={open} onOpenChange={(open) => {
    setOpen(open);
  }}>
    <DialogContent>
      <DialogHeader >
        <DialogTitle>{card.name}</DialogTitle>
        <DialogDescription>
          <div className="flex gap-4">
            <div className="shrink-0">
              <img src={getCardImageUrl(card.id)} className="h-64" />
            </div>
            <div>
              <div>
                <b>{YGOGameUtils.createZone(zoneData.zone, zoneData.player, zoneData.zoneIndex)}</b>
              </div>
              <div>
                <Select value={card.position} onValueChange={handleChangePosition}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Card position" />
                  </SelectTrigger>
                  <SelectContent>
                    {cardData.positions.map(positionData => <SelectItem value={positionData.value}>{positionData.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={returnCardToDeck}>Return Card To Deck</Button>
        </DialogFooter>
      </DialogHeader>
    </DialogContent>
  </Dialog>
}

function getCardPositions(zoneData: FieldZoneData, card: Card): PositionItem[] {

  if (zoneData.zone === "M" || zoneData.zone === "EMZ") {
    if (YGOGameUtils.isLinkMonster(card)) {
      return [{
        value: "faceup-attack",
        description: "Faceup Attack"
      }]
    }

    return [
      {
        value: "faceup-attack",
        description: "Faceup Attack"
      },
      {
        value: "faceup-defense",
        description: "Faceup Defense"
      },
      {
        value: "facedown",
        description: "Face Down"
      }
    ];
  }

  return [
    {
      value: "faceup-attack",
      description: "Faceup"
    },
    {
      value: "facedown",
      description: "Face Down"
    }
  ];

}
