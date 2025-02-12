import * as THREE from 'three';
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "../../../YGOCore";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { GameCard } from "../../game/GameCard";
import { getCardRotationFromFieldZoneData, getGameZone, getZonePositionFromZoneData } from "../../scripts/ygo-utils";
import { PositionTransition } from "../utils/position-transition";
import { RotationTransition } from "../utils/rotation-transition";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { Card } from "../../../YGOCore/types/types";
import { CallbackTransition } from '../utils/callback';
import { YGOCommandHandler } from '../../core/components/YGOCommandHandler';
import { MultipleTasks } from '../utils/multiple-tasks';

interface LinkSummonEventHandlerProps extends DuelEventHandlerProps {
    event: YGODuelEvents.LinkSummon
}

export class LinkSummonEventHandler extends YGOCommandHandler {
    private props: LinkSummonEventHandlerProps
    private cardReference: Card;

    constructor(props: LinkSummonEventHandlerProps) {
        super("link_summon_command");
        this.props = props;
        const event = this.props.event;
        this.cardReference = this.props.ygo.state.getCardById(event.id, event.zone);
    }

    public start(): void {

        const { event, ygo, duel, startTask } = this.props;
        const sequence = new YGOTaskSequence();

        const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;
        const zoneData = YGOGameUtils.getZoneData(event.zone)!;

        const rotationDelay = 0.5;

        const gyZone = YGOGameUtils.createZone("GY", event.player);
        const gyZoneData = YGOGameUtils.getZoneData(gyZone)!;

        const camera = duel.camera;

        if (event.materials?.length > 0) {
            for (let i = 0; i < event.materials.length; ++i) {
                const materialData = event.materials[i];
                const originZoneData = YGOGameUtils.getZoneData(materialData.zone)!;
                const originCardZone = getGameZone(duel, originZoneData)!;

                const card = originCardZone.getGameCard()!;
                const material = originCardZone.getCardReference()!;
                originCardZone.removeCard();

                const startPosition = getZonePositionFromZoneData(duel, originZoneData);
                const startRotation = getCardRotationFromFieldZoneData(duel, material, originZoneData);

                const endPosition = getZonePositionFromZoneData(duel, gyZoneData);
                const endRotation = getCardRotationFromFieldZoneData(duel, material, gyZoneData);

                card.gameObject.position.copy(startPosition);
                card.gameObject.rotation.copy(startRotation);
                card.hideCardStats();

                startTask(new YGOTaskSequence()
                    .add(
                        new PositionTransition({
                            gameObject: card.gameObject,
                            position: endPosition,
                            duration: 0.5
                        })
                    ).add(
                        new CallbackTransition(() => {
                            card.destroy();
                        })
                    ));

                startTask(new YGOTaskSequence()
                    .add(new WaitForSeconds(rotationDelay))
                    .add(new RotationTransition({
                        gameObject: card.gameObject,
                        rotation: endRotation,
                        duration: 0.3
                    })));
            }

            sequence.add(new WaitForSeconds(0.5));
        }

        const cardZone = getGameZone(duel, zoneData);
        const endPosition = getZonePositionFromZoneData(duel, zoneData);
        const endRotation = getCardRotationFromFieldZoneData(duel, this.cardReference, zoneData);

        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        const startPosition = camera.position.clone().add(direction.multiplyScalar(4));

        const card = new GameCard({ duel, card: this.cardReference });
        card.hideCardStats();
        card.gameObject.position.copy(startPosition);
        card.gameObject.visible = false;
        card.gameObject.lookAt(camera.position);

        sequence.add(new CallbackTransition(() => {
            card.gameObject.visible = true;
            duel.fields[originZoneData.player].extraDeck.updateExtraDeck();
        }))
            .add(new WaitForSeconds(1))
            .add(
                new MultipleTasks(
                    new PositionTransition({
                        gameObject: card.gameObject,
                        position: endPosition,
                        duration: 0.5
                    }),
                    new RotationTransition({
                        gameObject: card.gameObject,
                        rotation: endRotation,
                        duration: 0.5
                    })
                )
            )
            .add(new CallbackTransition(() => {
                this.props.onCompleted();
            }));

        startTask(sequence);

        cardZone?.setGameCard(card);
    }
}