import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "../../../YGOCore";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { getGameZone, getZonePositionFromZoneData } from "../../scripts/ygo-utils";
import { CallbackTransition } from "../utils/callback";
import { PositionTransition } from "../utils/position-transition";
import * as THREE from 'three';
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { Card } from "../../../YGOCore/types/types";
import { GameCard } from "../../game/GameCard";
import { Graveyard } from "../../game/Graveyard";
import { MultipleTasks } from "../utils/multiple-tasks";
import { ScaleTransition } from "../utils/scale-transition";

interface DestroyEventHandlerProps extends DuelEventHandlerProps {
    event: YGODuelEvents.Destroy
}

export class DestroyCardEventHandler extends YGOCommandHandler {
    private props: DestroyEventHandlerProps;

    constructor(props: DestroyEventHandlerProps) {
        super("move_card_command");
        this.props = props;
    }

    public start(): void {
        const { event, duel } = this.props;
        console.log("-------- DESTROY EVENT ------------")
        console.log(event);

        const sequence = new YGOTaskSequence();
        const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;
        const cardZone = getGameZone(duel, originZoneData);

        console.log(cardZone);

        let card = cardZone?.getGameCard();
        let gy!: Graveyard;
        let cardReference: Card | undefined;
        let startPosition!: THREE.Vector3;

        if (cardZone) {
            startPosition = cardZone.position.clone();
            gy = duel.fields[card!.cardReference.originalOwner].graveyard;
        }

        if (!card) {
            cardReference = duel.ygo.state.getCardData(event.id)!;
            startPosition = getZonePositionFromZoneData(duel, originZoneData);
            card = new GameCard({ duel, card: cardReference, stats: false });
            card.gameObject.position.copy(startPosition);
            gy = duel.fields[originZoneData.player].graveyard;
        }

        card.gameObject.visible = false;

        startPosition.z += 0.05;

        const PlaneGeometry = new THREE.PlaneGeometry(1, 1);
        const texture = duel.assets.getTexture(`${duel.config.cdnUrl}/images/particles/light_01.png`);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, color: 0xffff00 });
        const mesh = new THREE.Mesh(PlaneGeometry, material);
        mesh.scale.set(1, 1, 1);
        mesh.rotation.set(0, 0, 0);
        mesh.position.copy(startPosition);
        duel.core.scene.add(mesh);

        sequence.addMultiple(
            new MultipleTasks(
                new PositionTransition({
                    gameObject: mesh,
                    position: gy.cardPosition,
                    duration: 0.5
                }),
                new ScaleTransition({
                    gameObject: mesh,
                    scale: mesh.scale.addScalar(1.5),
                    duration: 0.25
                })
            ),
            new CallbackTransition(() => {
                mesh.visible = false
            })
        )

        gy.createSendToGraveyardEffect({ card: card.gameObject, sequence });

        sequence.add(new CallbackTransition(() => {
            duel.core.scene.remove(mesh);
            cardZone?.setCard(null);
            this.props.onCompleted();
        }))

        this.props.startTask(sequence);
    }
}