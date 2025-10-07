import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { CallbackTransition } from "../utils/callback";
import { MultipleTasks } from "../utils/multiple-tasks";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { Card } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { GameCardHand } from "../../game/GameCardHand";
import { RotationTransition } from "../utils/rotation-transition";
import { Ease } from "../../scripts/ease";
import { ArcPositionTransition } from "../utils/arc-position-transition";
import { randomIntFromInterval } from "../../scripts/ygo-utils";
import { YGOStatic } from "../../core/YGOStatic";

interface StartHandEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.StartHand;
}

export class StartHandEventHandler extends YGOCommandHandler {
  private props: StartHandEventHandlerProps;

  constructor(props: StartHandEventHandlerProps) {
    super("target_card_command");
    this.props = props;
  }

  public start(): void {
    const { event, duel } = this.props;
    const { player, cards = [] } = event;
    const field = duel.fields[player];
    const deck = field.mainDeck;
    const totalCards = cards.length;
    const cardsTransforms = field.hand.getCardsTransforms(totalCards);
    const cardRotation = field.hand.getCardsRotation();
    const pivotTransform = deck.getCardTransform();

    let done = false;
    let cardAnimationsDone = 0;

    const deckSize = deck.getDeckSize();
    deck.updateDeck(deckSize - cards.length);

    const onFinishCardAnimation = () => {
      if (++cardAnimationsDone >= totalCards) {
        if (!done) {
          done = true;
          this.props.onCompleted();
        }
      }
    }

    for (let i = 0; i < cards.length; ++i) {
      const isPlayerPov = YGOStatic.isPlayerPOV(player);
      const index = isPlayerPov ? i : totalCards - 1 - i;
      const cardData = cards[index];
      const card = duel.ygo.state.getCardData(cardData.id)!;
      const startPosition = pivotTransform.position.clone();
      const startRotation = pivotTransform.rotation.clone();
      const endRotation = new THREE.Euler().setFromVector3(cardRotation);

      const { card: cardInHand, sequence: cardSequence } = this.createMoveCardMotion({
        card,
        duel,
        player,
        position: cardsTransforms[index].position,
        arcHeight: isPlayerPov ? 5 : -3,
        // scale: cardsTransforms[index].scale,
        rotation: endRotation,
        startPosition: startPosition,
        startRotation: startRotation,
        startDelay: 0.05 * index
      });

      cardSequence.add(new CallbackTransition(onFinishCardAnimation));
      this.props.startTask(cardSequence);

      field.hand.cards.push(cardInHand);
    }

    if (totalCards === 0) {
      this.props.startTask(new YGOTaskSequence(
        new WaitForSeconds(0.1),
        new CallbackTransition(() => {
          if (!done) {
            done = true;
            this.props.onCompleted();
          }
        }))
      );
    }
  }

  private createMoveCardMotion({ duel,
    player,
    card,
    startPosition,
    startRotation,
    arcHeight,
    position,
    rotation,
    startDelay = 0,
  }: {
    duel: YGODuel,
    player: number,
    card: Card,
    startPosition: THREE.Vector3,
    startRotation: THREE.Euler,
    arcHeight: number,
    position: THREE.Vector3,
    rotation: THREE.Euler
    startDelay?: number
  }) {

    const cardInHand = new GameCardHand({
      duel,
      player
    });

    cardInHand.setCard(card);
    cardInHand.position.copy(position);
    cardInHand.position.copy(startPosition);
    cardInHand.gameObject.rotation.copy(startRotation);

    const sequence = new YGOTaskSequence(
      new WaitForSeconds(startDelay),
      new MultipleTasks(
        new CallbackTransition(() => {
          this.props.playSound({ key: duel.createCdnUrl(`/sounds/card-place-${randomIntFromInterval(1, 4)}.ogg`), volume: 0.7 });
        }),
        new ArcPositionTransition({
          duration: 0.5,
          gameObject: cardInHand.gameObject,
          position: position,
          arcHeight,
          ease: Ease.easeInOut,
        }),
        new RotationTransition({
          duration: 0.25,
          gameObject: cardInHand.gameObject,
          rotation: rotation,
          ease: Ease.easeInOut,
        })
      ),
      new CallbackTransition(() => {
        cardInHand.position = position.clone();
      })
    );

    return { card: cardInHand, sequence };
  }
}
