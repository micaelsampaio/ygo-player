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
import { UpdateTask } from '../utils/update-task';
import { ScaleTransition } from '../utils/scale-transition';
import { CardEmptyMesh } from '../../game/meshes/mesh-utils';
import { MaterialOpacityTransition } from '../utils/material-opacity';

interface FusionSummonEventHandlerProps extends DuelEventHandlerProps {
    event: YGODuelEvents.FusionSummon
}

export class FusionSummonEventHandler extends YGOCommandHandler {
    private props: FusionSummonEventHandlerProps
    private cardReference: Card;
    private cards: GameCard[];

    constructor(props: FusionSummonEventHandlerProps) {
        super("fusion_summon_command");
        this.props = props;
        this.cards = [];
        const event = this.props.event;
        this.cardReference = this.props.ygo.state.getCardById(event.id, event.zone);
    }

    public start(): void {
        const { event, duel, startTask } = this.props;
        const sequence = new YGOTaskSequence();

        const radius = 2;
        const camera = duel.camera;
        const direction = new THREE.Vector3();

        camera.getWorldDirection(direction);
        const pivotPosition = camera.position.clone().add(direction.multiplyScalar(8));
        const materialsCount = event.materials.length;

        // Initial setup of cards in a circle
        this.cards = event.materials.map((material, i) => {
            const zoneData = YGOGameUtils.getZoneData(material.zone);
            const cardZone = getGameZone(duel, zoneData)!;
            const card = cardZone.getGameCard();
            card.hideCardStats();

            const startRadius = radius * 2;
            const angle = (i / materialsCount) * Math.PI * 2;
            card.gameObject.position.copy(pivotPosition).add(
                new THREE.Vector3(
                    Math.cos(angle) * startRadius,
                    Math.sin(angle) * startRadius,
                    0
                )
            );
            return card;
        });

        this.cards.forEach(card => {
            card.gameObject.scale.set(0, 0, 0);
            startTask(new ScaleTransition({
                gameObject: card.gameObject,
                scale: new THREE.Vector3(1, 1, 1),
                duration: 0.15
            }));
        })

        const cardEffect = CardEmptyMesh({ color: 0xffffff, transparent: true });
        cardEffect.position.copy(pivotPosition);
        cardEffect.material.opacity = 0;
        cardEffect.position.z += 0.05;
        duel.core.scene.add(cardEffect);

        startTask(
            new YGOTaskSequence(
                new WaitForSeconds(1.25 - 0.2),
                new MaterialOpacityTransition({
                    material: cardEffect.material,
                    opacity: 1,
                    duration: 0.15
                }),
                new WaitForSeconds(0.25),
                new MaterialOpacityTransition({
                    material: cardEffect.material,
                    opacity: 0,
                    duration: 0.1
                }),
                new CallbackTransition(() => {
                    duel.core.scene.remove(cardEffect);
                })
            )
        );

        let updateCardPositionsTime = 0;
        const maxTime = 1.0;
        const rotations = 2;

        const updateCardPositions = new UpdateTask({
            onUpdate: (dt) => {
                updateCardPositionsTime += dt;
                const animationProgress = Math.min(updateCardPositionsTime / maxTime, 1.0);
                const easeOutCubic = 1 - Math.pow(1 - animationProgress, 3);

                this.cards.forEach((card, index) => {
                    const baseAngle = (index / materialsCount) * Math.PI * 2;

                    const rotationAngle = (1 - easeOutCubic) * rotations * Math.PI * 2;
                    const currentAngle = baseAngle + rotationAngle;

                    const currentRadius = radius * 2 * (1 - easeOutCubic);

                    const targetPos = new THREE.Vector3(
                        pivotPosition.x + Math.cos(currentAngle) * currentRadius,
                        pivotPosition.y + Math.sin(currentAngle) * currentRadius,
                        pivotPosition.z
                    );

                    const lerpFactor = 0.2 + (0.8 * easeOutCubic); // Lerp gets stronger as animation progresses
                    card.gameObject.position.lerp(targetPos, lerpFactor);
                });

                if (animationProgress >= 1.0) {
                    // this.cards.forEach(card => { card.destroy() });
                    this.cards.forEach(card => {
                        card.gameObject.position.copy(pivotPosition);
                    });
                    updateCardPositions.setTaskCompleted();
                }
            }
        });

        const zoneData = YGOGameUtils.getZoneData(event.zone)!;
        const cardZone = getGameZone(duel, zoneData);
        const endPosition = getZonePositionFromZoneData(duel, zoneData);
        const endRotation = getCardRotationFromFieldZoneData(duel, this.cardReference, zoneData);

        camera.getWorldDirection(direction);

        const card = new GameCard({ duel, card: this.cardReference });
        card.gameObject.position.copy(pivotPosition);
        card.gameObject.position.y += 0.05;
        card.gameObject.visible = false;

        sequence.addMultiple(
            new WaitForSeconds(0.25),
            updateCardPositions,
            new MultipleTasks(
                new WaitForSeconds(1),
                new CallbackTransition(() => {
                    card.gameObject.visible = true;
                    this.cards.forEach(card => card.destroy());
                })
            ),
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
            ),
            new CallbackTransition(() => {
                cardZone?.setGameCard(card);
                this.props.onCompleted();
            })
        )

        // const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;
        // const zoneData = YGOGameUtils.getZoneData(event.zone)!;

        // const camera = duel.camera;
        // const cardZone = getGameZone(duel, zoneData);
        // const endPosition = getZonePositionFromZoneData(duel, zoneData);
        // const endRotation = getCardRotationFromFieldZoneData(duel, this.cardReference, zoneData);

        // const direction = new THREE.Vector3();
        // camera.getWorldDirection(direction);

        // const startPosition = camera.position.clone().add(direction.multiplyScalar(4));
        // const card = new GameCard({ duel, card: this.cardReference });
        // card.hideCardStats();
        // card.gameObject.position.copy(startPosition);
        // card.gameObject.visible = false;
        // card.gameObject.lookAt(camera.position);

        // sequence.add(new CallbackTransition(() => {
        //     card.gameObject.visible = true;
        //     duel.fields[originZoneData.player].extraDeck.updateExtraDeck();
        // }))
        //     .add(new WaitForSeconds(1))
        //     .add(
        //         new MultipleTasks(
        //             new PositionTransition({
        //                 gameObject: card.gameObject,
        //                 position: endPosition,
        //                 duration: 0.5
        //             }),
        //             new RotationTransition({
        //                 gameObject: card.gameObject,
        //                 rotation: endRotation,
        //                 duration: 0.5
        //             })
        //         )
        //     )
        //     .add(new CallbackTransition(() => {
        //         this.props.onCompleted();
        //     }));

        startTask(sequence);

        // cardZone?.setGameCard(card);
    }
}