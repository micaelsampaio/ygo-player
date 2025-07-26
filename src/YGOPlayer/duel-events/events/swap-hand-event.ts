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
import { StartHandEventHandler } from "./start-hand-event";

interface SwapHandEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.SwapHand;
}

export class SwapHandEventHandler extends YGOCommandHandler {
  private drawNewHandEvent: YGOCommandHandler | undefined;

  constructor(private props: SwapHandEventHandlerProps) {
    super("swap_hand_handler");
  }

  public start(): void {
    const { event, duel } = this.props;
    const { player, cards = [] } = event;
    const field = duel.fields[player];
    const deck = field.mainDeck;
    const totalCards = cards.length;
    const targetTransform = deck.getCardTransform();
    const cardsTasks = new MultipleTasks();

    for (let i = 0; i < field.hand.cards.length; ++i) {
      const index = player === 0 ? i : totalCards - 1 - i;

      const { sequence: cardSequence } = this.createMoveCardMotion({
        cardInHand: field.hand.getCard(i)!,
        duel,
        player,
        arcHeight: player === 0 ? 2 : -1,
        endPosition: targetTransform.position.clone(),
        endRotation: targetTransform.rotation.clone(),
        startDelay: 0.05 * index,
      });

      cardsTasks.add(cardSequence);
    }

    const sequence = new YGOTaskSequence(
      cardsTasks,
      new CallbackTransition(() => {
        field.hand.destroyAllCards();
        this.drawNewHandEvent = new StartHandEventHandler(this.props as any);
        this.drawNewHandEvent.start();
      })
    );

    this.props.startTask(sequence);
  }

  private createMoveCardMotion({ duel,
    cardInHand,
    arcHeight,
    endPosition,
    endRotation: rotation,
    startDelay = 0,
  }: {
    duel: YGODuel,
    player: number,
    cardInHand: GameCardHand,
    arcHeight: number,
    endPosition: THREE.Vector3,
    endRotation: THREE.Euler
    startDelay?: number
  }) {

    const sequence = new YGOTaskSequence(
      new WaitForSeconds(startDelay),
      new MultipleTasks(
        new ArcPositionTransition({
          duration: 0.5,
          gameObject: cardInHand.gameObject,
          position: endPosition,
          arcHeight,
          ease: Ease.easeInOut,
        }),
        new RotationTransition({
          duration: 0.25,
          gameObject: cardInHand.gameObject,
          rotation: rotation,
          ease: Ease.easeInOut,
        }),
        new CallbackTransition(() => {
          this.props.playSound({ key: duel.createCdnUrl(`/sounds/card-place-${randomIntFromInterval(1, 4)}.ogg`), volume: 0.5 });
        }),
      ),
      new CallbackTransition(() => {
        cardInHand.position = endPosition.clone();
      })
    );

    return { card: cardInHand, sequence };
  }

  public finish(): void {
    this.drawNewHandEvent?.finish();
  }
}
