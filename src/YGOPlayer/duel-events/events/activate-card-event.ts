// if origin && zoen
// new Move card
// on complete -> start 
import * as THREE from 'three';
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "../../../YGOCore";
import { YGOGameState } from "../../../YGOCore/game/YGOGameState";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { GameCard } from "../../game/GameCard";
import { getCardRotationFromFieldZoneData, getGameZone, getZonePositionFromZoneData } from "../../scripts/ygo-utils";
import { MoveCardEventHandler } from "./move-card-event";
import { CallbackTransition } from '../utils/callback';
import { PositionTransition } from '../utils/position-transition';
import { WaitForSeconds } from '../utils/wait-for-seconds';
import { ChangeCardPositionHandler } from './change-card-position';
import { CardActivationEffect, GameModalOverlayMesh } from '../../game/meshes/mesh-utils';
import { MaterialOpacityTransition } from '../utils/material-opacity';

interface ActivateCardHandlerProps extends DuelEventHandlerProps {
    event: YGODuelEvents.Activate
}

export class ActivateCardHandler extends YGOCommandHandler {
    private command: YGOCommandHandler | undefined;

    constructor(private props: ActivateCardHandlerProps) {
        super("send_card_to_gy_command");

        // if (!this.props.event.reason) {
        //     this.childCommand = new MoveCardEventHandler(props as any);
        // }
    }

    public start(): void {

        const { event } = this.props;
        console.log("TCL:: EVENT ::: ", event)

        if (event.originZone && event.zone) {
            this.startMoveCommand();
        } else if (event.previousPosition === "facedown" && !event.zone.startsWith("H")) {
            this.startChangeCardPositionCommand();
        } else {
            this.startActivateCommand();
        }
    }

    private startMoveCommand() {
        const { event } = this.props;

        this.command = new MoveCardEventHandler({
            ...this.props,
            event: {
                id: event.id,
                originZone: event.originZone!,
                zone: event.zone,
                player: event.player,
                type: "Move Card"
            },
            onCompleted: () => {
                this.command?.finish();
                this.command = undefined;
                this.startActivateCommand();
            }
        });
        this.command.start();
    }

    private startChangeCardPositionCommand() {
        const { event } = this.props;

        this.command = new ChangeCardPositionHandler({
            ...this.props,
            event: {
                ...event,
                type: YGODuelEvents.LogType.ChangeCardPosition,
                id: event.id,
                player: event.player,
                originZone: event.zone,
                previousPosition: event.previousPosition,
                position: event.position,
            },
            onCompleted: () => {
                this.command?.finish();
                this.command = undefined;
                this.startActivateCommand();
            }
        });
        this.command.start();
    }

    private startActivateCommand() {
        const { ygo, duel, event } = this.props;

        const cardReference = ygo.state.getCardById(event.id, event.zone);
        const zoneData = YGOGameUtils.getZoneData(event.zone);
        const cardZone = getGameZone(duel, zoneData);
        const sequence = new YGOTaskSequence();
        const field = duel.fields[zoneData.player];

        duel.events.dispatch("set-selected-card", {
            player: zoneData.player,
            card: cardReference
        });

        const modal = GameModalOverlayMesh();
        modal.material.opacity = 0;
        duel.core.scene.add(modal);
        duel.core.enableRenderOverlay();

        this.props.startTask(new YGOTaskSequence(
            new MaterialOpacityTransition({
                material: modal.material,
                duration: 0.25,
                opacity: 0.7
            }),
            new WaitForSeconds(0.4),
            new MaterialOpacityTransition({
                material: modal.material,
                duration: 0.25,
                opacity: 0
            }),
        ));

        if (zoneData.zone === "GY" || zoneData.zone === "B") {
            const card = new GameCard({ duel, card: cardReference, stats: false });
            const startPosition: THREE.Vector3 = getZonePositionFromZoneData(duel, zoneData).clone();
            const startRotation: THREE.Euler = getCardRotationFromFieldZoneData(duel, cardReference, zoneData).clone();
            card.gameObject.position.copy(startPosition);
            card.gameObject.rotation.copy(startRotation);

            const cardOverlay = card.gameObject.clone();
            card.destroy();

            duel.core.sceneOverlay.add(cardOverlay);

            CardActivationEffect({ duel, card: cardOverlay, startTask: this.props.startTask });

            this.createActivationEffect(sequence, cardOverlay, startPosition);

        } else if (zoneData.zone === "H") {
            const card = field.hand.getCardFromReference(cardReference);
            const startPosition: THREE.Vector3 = card.position.clone();
            const startRotation: THREE.Euler = card.gameObject.rotation.clone();

            const cardOverlay = card.gameObject.clone();
            duel.core.sceneOverlay.add(cardOverlay);

            card.gameObject.visible = false;

            const up = new THREE.Vector3(0, 1, 0);
            up.applyQuaternion(card.gameObject.quaternion);

            card.isUiElementClick = false;
            card.isUiElementHover = false;

            CardActivationEffect({ duel, card: cardOverlay, startTask: this.props.startTask });

            this.createActivationEffect(sequence, cardOverlay, startPosition, up);

            sequence.add(new CallbackTransition(() => {
                card.gameObject.visible = true;
                card.gameObject.position.copy(startPosition);
                card.gameObject.rotation.copy(startRotation);
                card.isUiElementClick = true;
                card.isUiElementHover = true;
            }));
        } else if (cardZone) {
            const card = getGameZone(duel, zoneData)!.getGameCard();

            card.hideCardStats();

            const cardOverlay = card.gameObject.clone();
            duel.core.sceneOverlay.add(cardOverlay);

            card.gameObject.visible = false;

            CardActivationEffect({ duel, card: cardOverlay, startTask: this.props.startTask });

            this.createActivationEffect(sequence, cardOverlay, card.gameObject.position.clone());

            sequence.add(new CallbackTransition(() => {
                card.gameObject.visible = true;
                card.updateCardStats(zoneData);
            }));

        } else {
            this.props.onCompleted();
        }

        sequence.add(new CallbackTransition(() => {
            duel.core.disableRenderOverlay();
            this.props.onCompleted();
        }));

        this.props.startTask(sequence);
    }

    public createActivationEffect(seq: YGOTaskSequence, card: THREE.Object3D, startPos: THREE.Vector3, axis: THREE.Vector3 = new THREE.Vector3(0, 0, 1)) {
        const position = startPos.clone();
        position.add(axis);

        seq.add(
            new PositionTransition({
                gameObject: card,
                position,
                duration: 0.25
            }))
            .add(new WaitForSeconds(0.5))
            .add(new PositionTransition({
                gameObject: card,
                position: startPos,
                duration: 0.15
            }));
    }

    public finish(): void {
        this.command?.finish();
    }
}