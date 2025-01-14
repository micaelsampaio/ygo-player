import { DuelEventHandlerProps } from "..";
import { YGOGameUtils } from "../../../YGOCore";
import { MoveCardCommandData } from "../../../YGOCore/types/commands";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { GameCard } from "../../game/GameCard";
import { getCardRotationFromFieldZoneData, getGameZone, getZonePositionFromZoneData } from "../../scripts/ygo-utils";
import { CallbackTransition } from "../utils/callback";
import { PositionTransition } from "../utils/positionTransition";

interface MoveCardEventHandlerProps extends DuelEventHandlerProps {
    event: MoveCardCommandData
}

export function MoveCardEventHandler({ duel, ygo, event }: MoveCardEventHandlerProps) {
    const taskManager = duel.tasks;
    const cardReference = ygo.state.getCardById(event.id, event.zone);

    const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;
    const zoneData = YGOGameUtils.getZoneData(event.zone)!;

    const originCardZone = getGameZone(duel, zoneData);
    const cardZone = getGameZone(duel, zoneData);

    const startPosition = getZonePositionFromZoneData(duel, originZoneData);
    const startRotation = getCardRotationFromFieldZoneData(cardReference, originZoneData);

    const endPosition = getZonePositionFromZoneData(duel, zoneData);
    const endRotation = getCardRotationFromFieldZoneData(cardReference, zoneData);

    let card: GameCard | undefined = undefined;

    if (originCardZone) {
        originCardZone.destroyCard();
    }

    // @ts-ignore
    if (!card) {
        card = new GameCard({ duel, card: cardReference });
    }

    card.gameObject.position.copy(startPosition);
    card.gameObject.rotation.copy(startRotation);

    if (originZoneData.zone === "H") {
        duel.fields[originZoneData.player].hand.removeCardFromCardReference(cardReference);
        duel.updateHand(originZoneData.player);
    }

    if (cardZone) {
        cardZone.setGameCard(card);
    }

    let durationScale = 10;

    const sequence = new YGOTaskSequence();
    card.gameObject.rotation.copy(endRotation);

    if (originZoneData.zone === "GY") {
        const aboveZonePos = startPosition.clone();
        aboveZonePos.z += 1;

        sequence.add(new PositionTransition({
            gameObject: card.gameObject,
            position: aboveZonePos,
            duration: 0.25 * durationScale
        }))
    }

    if (zoneData.zone === "M" || zoneData.zone === "GY") {
        const aboveZonePos = endPosition.clone();
        aboveZonePos.z += 1;

        sequence.add(new PositionTransition({
            gameObject: card.gameObject,
            position: aboveZonePos,
            duration: 0.5 * durationScale
        })).add(new PositionTransition({
            gameObject: card.gameObject,
            position: endPosition,
            duration: 0.25 * durationScale
        }));
    } else {
        sequence.add(new PositionTransition({
            gameObject: card.gameObject,
            position: endPosition,
            duration: 1 * durationScale
        }));
    }

    sequence.add(new CallbackTransition(() => {

        if (zoneData.zone === "GY") {
            card.destroy();
        }

        duel.updateField();
    }));

    taskManager.startTask(sequence);

    //card.gameObject.rotation.copy(startRotation);

    //cardSequence.add(null as any).add(null as any);

    //taskManager.startTask(null as any);

    //taskManager.startTask(cardSequence);
}
