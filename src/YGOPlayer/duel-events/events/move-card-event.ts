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
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { YGOComponent } from "../../core/YGOComponent";
import { Card } from "../../../YGOCore/types/types";
import * as THREE from 'three';

interface MoveCardEventHandlerProps extends DuelEventHandlerProps {
    event: MoveCardCommandData
}


export class MoveCardEventHandler extends YGOComponent {
    private props: MoveCardEventHandlerProps
    private cardReference: Card;

    constructor(props: MoveCardEventHandlerProps) {
        super("move_card_command");
        this.props = props;
        const event = this.props.event;
        this.cardReference = this.props.ygo.state.getCardById(event.id, event.zone);
    }

    public start(): void {
        const { event, duel } = this.props;
        const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;
        const zoneData = YGOGameUtils.getZoneData(event.zone)!;

        const originCardZone = getGameZone(duel, originZoneData);
        const cardZone = getGameZone(duel, zoneData);

        let startPosition = getZonePositionFromZoneData(duel, originZoneData);
        let startRotation = getCardRotationFromFieldZoneData(this.cardReference, originZoneData);

        let endPosition = getZonePositionFromZoneData(duel, zoneData);
        let endRotation = getCardRotationFromFieldZoneData(this.cardReference, zoneData);

        let card: GameCard | undefined = undefined;

        if (originCardZone) {
            card = originCardZone.getGameCard()!;
            originCardZone.removeCard();
            startRotation = card.gameObject.rotation.clone();
        }

        // @ts-ignore
        if (!card) {
            card = new GameCard({ duel, card: this.cardReference });
        }

        card.hideCardStats();

        card.gameObject.position.copy(startPosition);
        card.gameObject.rotation.copy(startRotation);

        if (originZoneData.zone === "H") {
            duel.fields[originZoneData.player].hand.removeCardFromCardReference(this.cardReference);
            duel.renderField();
        }

        if (cardZone) {
            cardZone.setGameCard(card);
        }

        let durationScale = 1;
        let rotationDelay = 0;

        const sequence = new YGOTaskSequence();

        if (originZoneData.zone === "GY" || originZoneData.zone === "B") {
            const aboveZonePos = startPosition.clone();
            aboveZonePos.z += 1;

            sequence.add(new PositionTransition({
                gameObject: card.gameObject,
                position: aboveZonePos,
                duration: 0.25 * durationScale
            }));

            card.gameObject.scale.set(0, 0, 0);

            this.props.startTask(new ScaleTransition({
                gameObject: card.gameObject,
                scale: new THREE.Vector3(1, 1, 1),
                duration: 0.5 * durationScale
            }));

            rotationDelay = 0.3;
        }

        if (zoneData.zone === "M" || zoneData.zone === "S" || zoneData.zone === "GY" || zoneData.zone === "B") {
            const aboveZonePos = endPosition.clone();
            aboveZonePos.z += 1;
            aboveZonePos.y += 1;

            sequence.add(new PositionTransition({
                gameObject: card.gameObject,
                position: aboveZonePos,
                duration: 0.5 * durationScale
            }));

            if (zoneData.zone === "GY" || zoneData.zone === "B") {
                sequence.add(new CallbackTransition(() => {
                    this.props.startTask(new ScaleTransition({
                        gameObject: card.gameObject,
                        scale: new THREE.Vector3(0, 0, 0),
                        duration: 0.5 * durationScale
                    }));
                }));
            }

            sequence.add(new PositionTransition({
                gameObject: card.gameObject,
                position: endPosition,
                duration: 0.25 * durationScale
            }));

            this.props.startTask(new YGOTaskSequence()
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

            this.props.startTask(new RotationTransition({
                gameObject: card.gameObject,
                rotation: endRotation,
                duration: 0.3
            }));
        }

        sequence.add(new CallbackTransition(() => {

            if (!cardZone) {
                card.destroy();
            } else {
                card.showCardStats();
            }

            this.props.onCompleted();
        }));

        this.props.startTask(sequence);
    }
}

export function MoveCardEventHandler2({ duel, ygo, event, onCompleted }: MoveCardEventHandlerProps) {
    const cardReference = ygo.state.getCardById(event.id, event.zone);


}
