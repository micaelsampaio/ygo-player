import { DuelEventHandlerProps } from "..";
import { YGOGameUtils } from "../../../YGOCore";
import { MoveCardCommandData } from "../../../YGOCore/types/commands";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { GameCard } from "../../game/GameCard";
import { getCardRotationFromFieldZoneData, getGameZone, getZonePositionFromZoneData } from "../../scripts/ygo-utils";
import { CallbackTransition } from "../utils/callback";
import { PositionTransition } from "../utils/position-transition";
import { RotationTransition } from "../utils/rotation-transition";
import { ScaleTransition } from "../utils/scale-transition";
import * as THREE from 'three';
import { WaitForSeconds } from "../utils/wait-for-seconds";

interface MoveCardEventHandlerProps extends DuelEventHandlerProps {
    event: MoveCardCommandData
}

export function MoveCardEventHandler({ duel, ygo, event, onCompleted }: MoveCardEventHandlerProps) {
    const taskManager = duel.tasks;
    const cardReference = ygo.state.getCardById(event.id, event.zone);

    const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;
    const zoneData = YGOGameUtils.getZoneData(event.zone)!;

    const originCardZone = getGameZone(duel, originZoneData);
    const cardZone = getGameZone(duel, zoneData);

    let startPosition = getZonePositionFromZoneData(duel, originZoneData);
    let startRotation = getCardRotationFromFieldZoneData(cardReference, originZoneData);

    let endPosition = getZonePositionFromZoneData(duel, zoneData);
    let endRotation = getCardRotationFromFieldZoneData(cardReference, zoneData);

    let card: GameCard | undefined = undefined;

    if (originCardZone) {
        card = originCardZone.getGameCard()!;
        originCardZone.removeCard();
        startRotation = card.gameObject.rotation.clone();
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

    let durationScale = 1;
    let rotationDelay = 0;

    const sequence = new YGOTaskSequence();

    if (originZoneData.zone === "GY") {
        const aboveZonePos = startPosition.clone();
        aboveZonePos.z += 1;

        sequence.add(new PositionTransition({
            gameObject: card.gameObject,
            position: aboveZonePos,
            duration: 0.25 * durationScale
        }));

        card.gameObject.scale.set(0, 0, 0);

        taskManager.startTask(new ScaleTransition({
            gameObject: card.gameObject,
            scale: new THREE.Vector3(1, 1, 1),
            duration: 0.2 * durationScale
        }));

        rotationDelay = 0.3;
    }

    if (zoneData.zone === "M" || zoneData.zone === "S" || zoneData.zone === "GY") {
        const aboveZonePos = endPosition.clone();
        aboveZonePos.z += 1;

        sequence.add(new PositionTransition({
            gameObject: card.gameObject,
            position: aboveZonePos,
            duration: 0.5 * durationScale
        }))

        if (zoneData.zone === "GY") {
            sequence.add(new CallbackTransition(() => {
                taskManager.startTask(new ScaleTransition({
                    gameObject: card.gameObject,
                    scale: new THREE.Vector3(0, 0, 0),
                    duration: 0.2 * durationScale
                }));
            }));
        }

        sequence.add(new PositionTransition({
            gameObject: card.gameObject,
            position: endPosition,
            duration: 0.25 * durationScale
        }));

        taskManager.startTask(new YGOTaskSequence()
            .add(new WaitForSeconds(rotationDelay))
            .add(new RotationTransition({
                gameObject: card.gameObject,
                rotation: endRotation,
                duration: 0.3
            })));
    } else {
        sequence.add(new PositionTransition({
            gameObject: card.gameObject,
            position: endPosition,
            duration: 1 * durationScale
        }));

        taskManager.startTask(new RotationTransition({
            gameObject: card.gameObject,
            rotation: endRotation,
            duration: 0.3
        }));
    }

    sequence.add(new CallbackTransition(() => {

        if (!cardZone) {
            card.destroy();
        }

        onCompleted();
    }));

    taskManager.startTask(sequence);
}
