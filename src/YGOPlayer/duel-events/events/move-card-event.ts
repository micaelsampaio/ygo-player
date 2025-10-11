import { DuelEventHandlerProps } from "..";
import { FieldZoneData, YGOGameUtils } from "ygo-core";
import { MoveCardCommandData } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { GameCard } from "../../game/GameCard";
import {
  getCardRotationFromFieldZoneData,
  getGameZone,
  getZonePositionFromZoneData,
  randomIntFromInterval,
} from "../../scripts/ygo-utils";
import { CallbackTransition } from "../utils/callback";
import { PositionTransition } from "../utils/position-transition";
import { RotationTransition } from "../utils/rotation-transition";
import { ScaleTransition } from "../utils/scale-transition";
import { Card } from "ygo-core";
import * as THREE from "three";
import { MultipleTasks } from "../utils/multiple-tasks";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { WaitForSeconds } from "../utils/wait-for-seconds";

interface MoveMultileCardCommandData {
  player: number;
  id: number;
  ids: {
    id: number,
    originZone: FieldZoneData,
    zone: FieldZoneData,
  }[]
  originZone?: never;
  zone?: never
}

interface MoveCardEventHandlerProps extends DuelEventHandlerProps {
  event: MoveCardCommandData | MoveMultileCardCommandData;
  startCommandDelay?: number;
  cardReference?: Card
  cardIndex?: number
}

export class MoveCardEventHandler extends YGOCommandHandler {
  private props: MoveCardEventHandlerProps;
  private cardReference: Card | undefined;

  constructor(props: MoveCardEventHandlerProps) {
    super("move_card_command");
    this.props = props;
    const event = this.props.event;

    if (this.props.cardReference) {
      this.cardReference = this.props.cardReference;
    }

    if (!this.cardReference) {
      if (this.props.event.id) {
        this.cardReference = this.props.ygo.state.getCardById(event.id, event.zone!);
      }
    }
  }

  public start(): void {
    if (Array.isArray((this.props as any).event?.ids)) return this.startMultiple(this.props);

    if (!this.cardReference) return this.props.onCompleted();

    let scale = new THREE.Vector3(1, 1, 1);
    let card: GameCard | undefined = undefined;

    const { event: eventData, startCommandDelay: delay = 0, duel, playSound } = this.props;
    const event = eventData as MoveCardCommandData;
    const sequence = new YGOTaskSequence();
    const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;
    const zoneData = YGOGameUtils.getZoneData(event.zone)!;

    const originCardZone = getGameZone(duel, originZoneData);
    const cardZone = getGameZone(duel, zoneData);
    const owner = (event as any).owner ?? this.cardReference.originalOwner ?? this.cardReference.owner;

    if (delay > 0) sequence.add(new WaitForSeconds(delay));

    if (duel.settings.getConfigFromPath("showCardWhenPlayed")) {
      duel.gameActions.setSelectedCard({
        player: zoneData.player,
        card: this.cardReference,
      })
    }

    if (originZoneData.zone === "D") {
      duel.fields[originZoneData.player].mainDeck.updateDeck();
    }

    if (originZoneData.zone === "ED") {
      const field = duel.fields[originZoneData.player];
      field.extraDeck.updateExtraDeck();
      const gameCard = field.extraDeck.getGameCard(this.cardReference);

      if (gameCard) {
        card = new GameCard({ card: gameCard.cardReference!, duel });
        card.hideCardStats();
        card.gameObject.position.copy(gameCard.gameObject.position);
        card.gameObject.rotation.copy(gameCard.gameObject.rotation);
        card.gameObject.scale.copy(gameCard.gameObject.scale);
      }

      field.extraDeck.destroyGameCard(this.cardReference);
    }

    if (zoneData.zone === "H") {
      // if card goes to hand
      duel.updateHand(event.player);
      duel.renderHand(event.player);
      duel.fields[event.player].hand.getCard(
        zoneData.zoneIndex - 1
      )!.gameObject.visible = false;
    }

    let startPosition = getZonePositionFromZoneData(duel, originZoneData);
    let startRotation = getCardRotationFromFieldZoneData(
      duel,
      this.cardReference,
      originZoneData
    ).clone();

    let endPosition = getZonePositionFromZoneData(duel, zoneData);
    let endRotation = getCardRotationFromFieldZoneData(
      duel,
      this.cardReference,
      zoneData
    );

    if (originCardZone && !card) {
      card = originCardZone.getGameCard()!;
      originCardZone.removeCard();
    }

    if (card) {
      startPosition = card.gameObject.position.clone();
      startRotation = card.gameObject.rotation.clone();
    }

    if (cardZone) {
      scale = cardZone.scale.clone();
    }

    // @ts-ignore
    if (!card) {
      card = new GameCard({ duel, card: this.cardReference });
    }

    card.hideCardStats();

    card.gameObject.position.copy(startPosition);
    card.gameObject.rotation.copy(startRotation);

    if (originZoneData.zone === "H") {
      duel.fields[originZoneData.player].hand.removeCardFromCardReference(
        this.cardReference
      );
      duel.renderField();
    }

    if (originZoneData.zone === "GY") {
      const gy = duel.fields[owner].graveyard;
      gy.createMoveFromGraveyardEffect({ card: card.gameObject, sequence });
    }

    if (originZoneData.zone === "B") {
      const banish = duel.fields[owner].banishedZone;
      banish.createMoveFromBanishCardEffect({
        card: card.gameObject,
        sequence,
      });
    }

    // default move sound; use randomized card-place variants only for hand -> monster/spell placements
    const soundKey = (originZoneData?.zone === "H" && (zoneData.zone === "M" || zoneData.zone === "S"))
      ? `/sounds/card-place-${randomIntFromInterval(1, 4)}.ogg`
      : `/sounds/move.ogg`;

    playSound({ key: duel.createCdnUrl(soundKey), volume: 0.7 });

    if (Number(this.props.cardIndex) > 0) {
      const index = Number(this.props.cardIndex);
      endPosition.x -= index * 1.5;
      endPosition.z += index * 0.2;
    }

    if (
      zoneData.zone === "M" ||
      zoneData.zone === "S" ||
      zoneData.zone === "GY" ||
      zoneData.zone === "B"
    ) {
      sequence.add(
        new MultipleTasks(
          new PositionTransition({
            gameObject: card.gameObject,
            position: endPosition,
            duration: 0.4,
          }),
          new RotationTransition({
            gameObject: card.gameObject,
            rotation: endRotation,
            duration: 0.25,
          }),
          new ScaleTransition({
            gameObject: card.gameObject,
            scale,
            duration: 0.25,
          })
        )
      );

      if (zoneData.zone === "GY") {
        const gy = duel.fields[owner].graveyard;
        gy.createSendToGraveyardEffect({ card: card.gameObject, sequence });
      }
      if (zoneData.zone === "B") {
        const banish = duel.fields[owner].banishedZone;
        banish.createBanishCardEffect({ card: card.gameObject, sequence });
      }
    } else {
      sequence.add(
        new MultipleTasks(
          new PositionTransition({
            gameObject: card.gameObject,
            position: endPosition,
            duration: 0.5,
          }),
          new RotationTransition({
            gameObject: card.gameObject,
            rotation: endRotation,
            duration: 0.3,
          }),
          new ScaleTransition({
            gameObject: card.gameObject,
            scale,
            duration: 0.3,
          })
        )
      );
    }

    sequence.add(
      new CallbackTransition(() => {
        if (!cardZone) {
          card.destroy();
        } else {
          cardZone.setGameCard(card);
        }

        duel.updateHand(event.player);
        duel.updateExtraDeck(event.player);

        this.props.onCompleted();
      })
    );

    duel.events.dispatch("close-ui-menu", { type: "card-materials-menu" });

    this.props.startTask(sequence);
  }

  public startMultiple(props: any): void {
    const event = this.props.event as MoveMultileCardCommandData;

    let completedTasks = 0;
    let tasks = event.ids.length;

    const completeTask = () => {
      ++completedTasks;

      if (tasks === completedTasks) {
        this.props.onCompleted();
      }
    }

    const sequence = new YGOTaskSequence();

    event.ids.forEach((cardData, index) => {
      sequence.add(new WaitForSeconds((index - completedTasks) * 0.05));
      sequence.add(new CallbackTransition(() => {
        const data = cardData;
        const cardReference = {
          ...this.props.duel.ygo.state.getCardData(data.id),
          ...data
        } as Card;
        const command = new MoveCardEventHandler({
          ...this.props,
          cardReference,
          cardIndex: index - completedTasks,
          event: {
            ...this.props.event,
            ...data,
            id: data.id,
            originZone: data.originZone,
            zone: data.zone,
            ids: undefined,
          } as any,
          onCompleted: () => {
            completeTask();
          }
        })
        command.start();
      }))
    })

    this.props.startTask(sequence);
  }
}
