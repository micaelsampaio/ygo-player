// if origin && zoen
// new Move card
// on complete -> start
import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import {
  getCardRotationFromFieldZoneData,
  getGameZone,
} from "../../scripts/ygo-utils";
import { MoveCardEventHandler } from "./move-card-event";
import { CallbackTransition } from "../utils/callback";
import { PositionTransition } from "../utils/position-transition";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { RotationTransition } from "../utils/rotation-transition";

interface ChangeCardPositionHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.ChangeCardPosition | YGODuelEvents.MoveCard;
}

export class ChangeCardPositionHandler extends YGOCommandHandler {
  private moveCommand: MoveCardEventHandler | undefined;

  constructor(private props: ChangeCardPositionHandlerProps) {
    super("change_card_position_handler");
  }

  public start(): void {
    const event = this.props.event as YGODuelEvents.MoveCard;
    if (event.originZone && event.zone) {
      this.startMoveCommand();
    } else {
      this.startChangePositionCommand();
    }
  }

  private startMoveCommand() {
    const event = this.props.event as YGODuelEvents.MoveCard;

    this.moveCommand = new MoveCardEventHandler({
      ...this.props,
      event: {
        ...event,
        type: event.type as any,
        id: event.id,
        originZone: event.originZone!,
        zone: event.zone,
        player: event.player,
      },
    });
    this.moveCommand.start();
  }

  private startChangePositionCommand() {
    const { ygo, duel, startTask } = this.props;
    const event = this.props.event as YGODuelEvents.ChangeCardPosition;
    const cardReference = ygo.state.getCardById(event.id, event.originZone);
    const zoneData = YGOGameUtils.getZoneData(event.originZone);
    const cardZone = getGameZone(duel, zoneData);
    const sequence = new YGOTaskSequence();

    if (duel.settings.getConfigFromPath("showCardWhenPlayed")) {
      duel.gameActions.setSelectedCard({
        player: zoneData.player,
        card: cardReference,
        force: true,
      })
    }

    if (cardZone) {
      const card = getGameZone(duel, zoneData)!.getGameCard();
      const startPosition: THREE.Vector3 = card.gameObject.position.clone();
      const targetRotation = getCardRotationFromFieldZoneData(
        duel,
        cardReference,
        zoneData
      );
      const abovePosition = startPosition.clone();
      abovePosition.z += 1;

      card.hideCardStats();

      sequence.addMultiple(
        new PositionTransition({
          gameObject: card.gameObject,
          duration: 0.25,
          position: abovePosition,
        }),
        new WaitForSeconds(0.15),
        new PositionTransition({
          gameObject: card.gameObject,
          duration: 0.15,
          position: startPosition,
        })
      );

      startTask(
        new YGOTaskSequence(
          new WaitForSeconds(0.15),
          new RotationTransition({
            gameObject: card.gameObject,
            duration: 0.2,
            rotation: targetRotation,
          })
        )
      );

      sequence.add(
        new CallbackTransition(() => {
          card.gameObject.position.copy(startPosition);
          card.gameObject.rotation.copy(targetRotation);
          card.updateCardStats(zoneData);
        })
      );
    } else {
      this.props.onCompleted();
      return;
    }

    sequence.add(
      new CallbackTransition(() => {
        this.props.onCompleted();
      })
    );

    this.props.startTask(sequence);
  }

  public finish(): void {
    this.moveCommand?.finish();
  }
}
