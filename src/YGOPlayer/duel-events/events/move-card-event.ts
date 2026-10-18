import type { DuelEventHandlerProps } from "../types";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import type { CardPosition, FieldZone, MoveCardCommandData, PlayerField } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { GameCard } from "../../game/GameCard";
import {
  createOffsetPositionInMultipleEvents,
  getCardRotationFromFieldZoneData,
  getGameZone,
  getZonePositionFromZoneData,
  randomIntFromInterval,
} from "../../scripts/ygo-utils";
import { CallbackTransition } from "../utils/callback";
import { Card } from "ygo-core";
import * as THREE from "three";
import { moveAndRotate } from "../utils/animation-builders";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { revealCardAnimation } from "./reveal-event";

/**
 * One card move: a MoveCard-shaped duel log, or one built by another handler
 * (activate, tribute, change position) that moves a card first.
 */
type MoveSingleCardEvent = Omit<MoveCardCommandData, "type"> & {
  type?: YGODuelEvents.DuelLogType;
  /** MoveCardCommand logs: the card's original owner. */
  owner?: number;
  ids?: undefined;
};

/** A batch move (e.g. a multi-card Banish): played as one move per `ids` entry. */
interface MoveMultipleCardsEvent {
  player: number;
  type?: YGODuelEvents.DuelLogType;
  id?: number;
  ids: {
    id: number,
    originZone: FieldZone,
    zone: FieldZone,
    owner?: number,
    position?: CardPosition,
  }[]
  originZone?: never;
  zone?: never
}

type MoveCardEvent = MoveSingleCardEvent | MoveMultipleCardsEvent;

function isMultipleCardsMove(event: MoveCardEvent | undefined): event is MoveMultipleCardsEvent {
  return Array.isArray(event?.ids);
}

interface MoveCardEventHandlerProps extends DuelEventHandlerProps {
  event: MoveCardEvent;
  startCommandDelay?: number;
  cardReference?: Card
  cardIndex?: number
}

/**
 * The exact slot a move landed in when its destination names none: a
 * MoveCard log keeps the requested zone, and a server command may ask for
 * "H2" or "B" (the core then appends to the hand, or puts the card on top of
 * the banished zone). Any other zone, or a card not found there, is returned
 * as is.
 */
export function exactLandedZone(fields: PlayerField[] | undefined, id: number | undefined, zone: FieldZone): FieldZone {
  if (!fields || id === undefined) return zone;
  const { zone: zoneId, player, zoneIndex } = YGOGameUtils.getZoneData(zone);
  if (zoneIndex !== -1 || (zoneId !== "H" && zoneId !== "B")) return zone;

  const field = fields[player];
  if (!field) return zone;
  const index = zoneId === "H"
    ? field.hand.map(card => card?.id).lastIndexOf(id)
    : field.banishedZone.findIndex(card => card?.id === id);
  return index === -1 ? zone : YGOGameUtils.createZone(zoneId, player, index + 1);
}

export class MoveCardEventHandler extends YGOCommandHandler {
  private props: MoveCardEventHandlerProps;
  private cardReference: Card | undefined;

  constructor(props: MoveCardEventHandlerProps) {
    super("move_card_command");
    this.props = props;

    // "H2"/"B" (no slot) cannot be looked up or animated to: use the slot the card landed in.
    // A copy: the log itself stays as the core recorded it.
    if (!isMultipleCardsMove(props.event) && props.event.zone) {
      const zone = exactLandedZone(props.ygo?.state?.getPlayersField?.(), props.event.id, props.event.zone);
      if (zone !== props.event.zone) this.props = { ...props, event: { ...props.event, zone } };
    }

    const event = this.props.event;

    if (this.props.cardReference) {
      this.cardReference = this.props.cardReference;
    }

    if (!this.cardReference) {
      if (event.id) {
        this.cardReference = this.props.ygo.state.getCardById(event.id, event.zone!);
      }
    }
  }

  public start(): void {
    if (isMultipleCardsMove(this.props.event)) return this.startMultiple(this.props.event);

    if (!this.cardReference) return this.props.onCompleted();

    let scale = new THREE.Vector3(1, 1, 1);
    let card: GameCard | undefined = undefined;

    const { event: eventData, startCommandDelay: delay = 0, duel, playSound } = this.props;
    const event = eventData as MoveSingleCardEvent;
    const sequence = new YGOTaskSequence();
    const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;
    const zoneData = YGOGameUtils.getZoneData(event.zone)!;

    const originCardZone = getGameZone(duel, originZoneData);
    const cardZone = getGameZone(duel, zoneData);
    const owner = event.owner ?? this.cardReference.originalOwner ?? this.cardReference.owner;

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

    const endPosition = getZonePositionFromZoneData(duel, zoneData);
    const endRotation = getCardRotationFromFieldZoneData(
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

    endPosition.copy(createOffsetPositionInMultipleEvents(this.props.duel, this.props.event.player, this.props.cardIndex, endPosition));

    // Onto the field / GY / banishment the card lands a bit faster.
    const toBoardOrPile = zoneData.zone === "M" || zoneData.zone === "S" || zoneData.zone === "GY" || zoneData.zone === "B";
    sequence.add(moveAndRotate(card.gameObject, {
      position: endPosition,
      rotation: endRotation,
      scale,
      duration: toBoardOrPile ? 0.4 : 0.5,
      rotationDuration: toBoardOrPile ? 0.25 : 0.3,
    }));

    if (toBoardOrPile) {
      if (zoneData.zone === "GY") {
        const gy = duel.fields[owner].graveyard;
        gy.createSendToGraveyardEffect({ card: card.gameObject, sequence });
      }
      if (zoneData.zone === "B") {
        const banish = duel.fields[owner].banishedZone;
        banish.createBanishCardEffect({ card: card.gameObject, sequence });
      }
    }

    if ((originZoneData.zone === "GY" || originZoneData.zone === "B") && (zoneData.zone === "H")) {
      revealCardAnimation({
        originalCard: card.gameObject,
        card: card.gameObject,
        duel,
        startPosition: endPosition,
        startRotation: endRotation,
        player: event.player,
        sequence,
        startTask: this.props.startTask
      });
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

  public startMultiple(event: MoveMultipleCardsEvent): void {
    let completedTasks = 0;
    const tasks = event.ids.length;

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
            ...event,
            ...data,
            id: data.id,
            originZone: data.originZone,
            zone: data.zone,
            ids: undefined,
          },
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
