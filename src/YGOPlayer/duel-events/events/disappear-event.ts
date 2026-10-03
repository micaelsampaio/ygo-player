import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { ScaleTransition } from "../utils/scale-transition";
import { CardEmptyMesh } from "../../game/meshes/mesh-utils";
import { MaterialOpacityTransition } from "../utils/material-opacity";
import { getGameZone } from "../../scripts/ygo-utils";
import { CallbackTransition } from "../utils/callback";

interface DisappearEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.Disappear;
}

export class DisappearEventHandler extends YGOCommandHandler {

  constructor(private props: DisappearEventHandlerProps) {
    super("disapear_command");
    this.props = props;
  }

  public start(): void {
    const { event, duel, startTask } = this.props;

    const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;
    const originCardZone = getGameZone(duel, originZoneData)!;

    if (!originCardZone || !originCardZone.getGameCard()) {
      return this.props.onCompleted();
    }

    const cardEffect = CardEmptyMesh({ color: 0xffffff, transparent: true });
    const card = originCardZone.getGameCard();

    cardEffect.material.opacity = 0;
    duel.core.scene.add(cardEffect);
    originCardZone.removeCard();

    cardEffect.position.copy(card.gameObject.position);
    cardEffect.rotation.copy(card.gameObject.rotation);
    cardEffect.position.z += 0.05;

    card.hideCardStats();

    startTask(
      new YGOTaskSequence(
        new MaterialOpacityTransition({
          material: cardEffect.material,
          opacity: 1,
          duration: 0.15,
        }),
        new CallbackTransition(() => {
          card.destroy();
        }),
        new ScaleTransition({
          gameObject: cardEffect,
          scale: new THREE.Vector3(0, 0, 0),
          duration: 0.15,
        }),
        new CallbackTransition(() => {
          originCardZone.setCard(null);
          duel.core.scene.remove(cardEffect);
          this.props.onCompleted();
        })
      )
    );
  }
}
