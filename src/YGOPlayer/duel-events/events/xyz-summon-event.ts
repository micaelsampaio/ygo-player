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

interface XYZSummonEventHandlerProps extends DuelEventHandlerProps {
    event: YGODuelEvents.XYZSummon
}

export class XYZSummonEventHandler extends YGOCommandHandler {
    private props: XYZSummonEventHandlerProps
    private cardReference: Card;

    constructor(props: XYZSummonEventHandlerProps) {
        super("xyz_summon_command");
        this.props = props;
        const event = this.props.event;
        this.cardReference = this.props.ygo.state.getCardById(event.id, event.zone);
    }

    public start(): void {

        const { event, duel, startTask } = this.props;
        const sequence = new YGOTaskSequence();

        const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;
        const zoneData = YGOGameUtils.getZoneData(event.zone)!;

        const camera = duel.camera;
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