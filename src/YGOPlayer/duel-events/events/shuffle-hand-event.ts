import { DuelEventHandlerProps } from "..";
import { YGODuelEvents } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { CallbackTransition } from "../utils/callback";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { PositionTransition } from "../utils/position-transition";
import { fisherYatesShuffle } from "../../scripts/ygo-utils";
import { MultipleTasks } from "../utils/multiple-tasks";
import { ScaleTransition } from "../utils/scale-transition";
import { YGOTask } from "../../core/components/tasks/YGOTask";
import { Ease } from "../../scripts/ease";
import { WaitForSeconds } from "../utils/wait-for-seconds";

interface ShuffleHandEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.ShuffleHand;
}

export class ShuffleHandEventHandler extends YGOCommandHandler {
  private props: ShuffleHandEventHandlerProps;
  private timer: number;

  constructor(props: ShuffleHandEventHandlerProps) {
    super("shuffle_hand_commmand");
    this.props = props;
    this.timer = -1;
  }

  public start(): void {
    const { event, duel } = this.props;

    const sequence = new YGOTaskSequence();
    const hand = duel.ygo.getField(event.player).hand;
    const gameHand = duel.fields[event.player].hand;
    const gameHandIdsToSync = gameHand.cards.map((c, index) => ({ id: c.card.id, index }));
    const newGameHandIds: number[] = [];

    const handIsSync = hand.every((c, handIndex) => {
      const index = gameHandIdsToSync.findIndex(temp => temp.id === c.id);
      if (index !== -1) {
        newGameHandIds[handIndex] = gameHandIdsToSync[index].index;
        gameHandIdsToSync.splice(index, 1);
        return true;
      }
      return false;
    });

    if (!handIsSync || gameHandIdsToSync.length > 0) {
      duel.updateHand(event.player);
      setTimeout(() => this.props.onCompleted());
      return;
    }

    const handTransforms = gameHand.getCardsTransforms(hand.length);
    const shuffledIndexes = derangement([...Array(gameHand.cards.length).keys()]);
    const fakeMovementsTasks: YGOTask[] = [];

    gameHand.cards.forEach((card, index) => {
      const targetIndex = shuffledIndexes[index];
      fakeMovementsTasks.push(
        new PositionTransition({
          gameObject: card.gameObject,
          position: handTransforms[targetIndex].position,
          duration: 0.2,
        })
      );
      fakeMovementsTasks.push(
        new ScaleTransition({
          gameObject: card.gameObject,
          scale: handTransforms[targetIndex].scale,
          duration: 0.2,
        })
      );
    });

    sequence.add(new MultipleTasks(...fakeMovementsTasks));

    const shufflePositionsTasks: YGOTask[] = [];

    hand.forEach((cardData, finalIndex) => {
      const cardObj = gameHand.cards.find(c => c.card.id === cardData.id)!;
      shufflePositionsTasks.push(
        new PositionTransition({
          gameObject: cardObj.gameObject,
          position: handTransforms[finalIndex].position,
          duration: 0.3,
        })
      );
      shufflePositionsTasks.push(
        new ScaleTransition({
          gameObject: cardObj.gameObject,
          scale: handTransforms[finalIndex].scale,
          duration: 0.3,
        })
      );
    });

    sequence.add(new MultipleTasks(...shufflePositionsTasks));
    sequence.add(new WaitForSeconds(0.2));
    sequence.add(new CallbackTransition(() => {
      this.props.onCompleted();
    }));

    this.props.startTask(sequence);
  }

  public finish(): void {
    clearTimeout(this.timer);
  }
}


function derangement(array: number[]): number[] {
  const n = array.length;
  let result: number[];
  let attempts = 0;

  do {
    result = [...array];
    // Fisher–Yates shuffle
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    attempts++;
    // repeat until no element is in its original position
  } while (result.some((val, idx) => val === array[idx]) && attempts < 100);

  return result;
}