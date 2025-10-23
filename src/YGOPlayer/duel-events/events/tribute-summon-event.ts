import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { GameCard } from "../../game/GameCard";
import {
  getCardRotationFromFieldZoneData,
  getGameZone,
  getZonePositionFromZoneData,
} from "../../scripts/ygo-utils";
import { PositionTransition } from "../utils/position-transition";
import { RotationTransition } from "../utils/rotation-transition";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { Card } from "ygo-core";
import { CallbackTransition } from "../utils/callback";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { MultipleTasks } from "../utils/multiple-tasks";
import { Ease } from "../../scripts/ease";
import { MoveCardEventHandler } from "./move-card-event";
import { ScaleTransition } from "../utils/scale-transition";
import { MaterialOpacityTransition } from "../utils/material-opacity";

interface TributeSummonEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.TributeSummon;
}

export class TributeSummonEventHandler extends YGOCommandHandler {
  private props: TributeSummonEventHandlerProps;
  private cardReference: Card;

  constructor(props: TributeSummonEventHandlerProps) {
    super("tribute_summon_command");
    this.props = props;
    const event = this.props.event;
    this.cardReference = this.props.ygo.state.getCardById(event.id, event.zone);
  }

  public start(): void {
    const { event, duel, startTask } = this.props;
    const sequence = new YGOTaskSequence();

    const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;
    const zoneData = YGOGameUtils.getZoneData(event.zone)!;

    if (event.tributes?.length > 0) {

      this.props.playSound({ key: duel.createCdnUrl(`/sounds/materials_vanish.ogg`), volume: 0.25 });

      for (let i = 0; i < event.tributes.length; ++i) {
        const tribute = event.tributes[i];
        const originZoneData = YGOGameUtils.getZoneData(tribute.zone)!;
        const originCardZone = getGameZone(duel, originZoneData)!;
        const card = originCardZone.getGameCard()!;

        if (!card) continue;

        const circle = new THREE.Mesh(
          new THREE.PlaneGeometry(10, 10, 10),
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: duel.core.textureLoader.load(duel.createCdnUrl("/images/particles/circle_03.png")),
            transparent: true,
          })
        );

        const star = new THREE.Mesh(
          new THREE.PlaneGeometry(8, 8, 8),
          new THREE.MeshBasicMaterial({
            color: 0xffff00,
            map: duel.core.textureLoader.load(duel.createCdnUrl("/images/particles/star_08.png")),
            transparent: true,
          })
        );
        circle.position.copy(card.gameObject.position);
        circle.position.z += 0.2;
        star.position.copy(card.gameObject.position);
        star.position.z += 0.2;
        star.rotateZ(THREE.MathUtils.degToRad(Math.random() * 360));
        star.scale.set(1, 1, 1);
        circle.scale.set(0.3, 0.3, 0.3);
        duel.core.scene.add(circle);
        duel.core.scene.add(star);

        startTask(new YGOTaskSequence(
          new MultipleTasks(
            new MaterialOpacityTransition({
              material: star.material,
              opacity: 0,
              duration: 0.25,
            }),
            new ScaleTransition({
              gameObject: star,
              scale: new THREE.Vector3(2, 2, 2),
              duration: 0.25,
              ease: Ease.easeInOut,
            }),
            new ScaleTransition({
              gameObject: circle,
              scale: new THREE.Vector3(1, 1, 1),
              duration: 0.5,
              ease: Ease.easeInOut,
            }),
            new MaterialOpacityTransition({
              material: circle.material,
              duration: 0.5,
              opacity: 0,
              ease: Ease.easeInOut,
            })
          ),
          new CallbackTransition(() => {
            duel.core.scene.add(circle);
            duel.core.scene.add(star);
          })
        ));

        startTask(new YGOTaskSequence(
          new WaitForSeconds(0.2),
          new CallbackTransition(() => {
            new MoveCardEventHandler({
              ...this.props,
              startCommandDelay: i * 0.2,
              cardIndex: i,
              event: {
                id: tribute.id,
                originZone: tribute.zone,
                player: event.player,
                zone: YGOGameUtils.createZone("GY", tribute.owner),
                type: "Move Card",
              },
              onCompleted: () => {
                card.destroy();
              },
            }).start();
          })
        ))

        sequence.add(new WaitForSeconds(0.5));
      }
    }

    const cardZone = getGameZone(duel, zoneData);
    const endPosition = getZonePositionFromZoneData(duel, zoneData);
    const endRotation = getCardRotationFromFieldZoneData(
      duel,
      this.cardReference,
      zoneData
    );

    const hand = duel.fields[originZoneData.player].hand;
    const cardInHand = hand.getCardFromCardIdAnZoneIndex(event.id, originZoneData.zoneIndex - 1);
    const startPosition = cardInHand.gameObject.position.clone();
    const startRotation = cardInHand.gameObject.rotation.clone();
    cardInHand.gameObject.visible = false;

    hand.removeCardFromCardReference(this.cardReference);
    hand.render();

    const card = new GameCard({ duel, card: this.cardReference, player: zoneData.player });
    card.hideCardStats();
    card.gameObject.position.copy(startPosition);
    card.gameObject.rotation.copy(startRotation);

    sequence.addMultiple(
      new MultipleTasks(
        new PositionTransition({
          gameObject: card.gameObject,
          position: endPosition,
          duration: 0.5,
          ease: Ease.easeInOut
        }),
        new RotationTransition({
          gameObject: card.gameObject,
          rotation: endRotation,
          duration: 0.15,
          ease: Ease.easeInOut
        })
      ),
      new CallbackTransition(() => {
        cardZone?.setGameCard(card);
        this.props.onCompleted();
      })
    )

    startTask(sequence);
  }
}