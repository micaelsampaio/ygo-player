import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { CallbackTransition } from "../utils/callback";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { PositionTransition } from "../utils/position-transition";
import { RotationTransition } from "../utils/rotation-transition";
import { MultipleTasks } from "../utils/multiple-tasks";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { GameCard } from "../../game/GameCard";
import { YGOStatic } from "../../core/YGOStatic";
import { Ease } from "../../scripts/ease";

interface ShowHandEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.ShowHand;
}

export class ShowHandEventHandler extends YGOCommandHandler {
  constructor(private props: ShowHandEventHandlerProps) {
    super("show_hand_command");
  }

  public start(): void {
    const { event, duel, onCompleted, startTask, playSound } = this.props;
    const { player, cards } = event;

    if (!cards || cards.length === 0) {
      setTimeout(() => onCompleted());
      return;
    }

    const gameHand = duel.fields[player].hand;
    const originalShowHand = gameHand.showHand;
    const sequence = new YGOTaskSequence();

    const clones: GameCard[] = [];
    const originalObjects: THREE.Object3D[] = [];
    const startPositions: THREE.Vector3[] = [];
    const startRotations: THREE.Euler[] = [];

    // Pull toward screen center: player POV is at bottom (negative Y) → move up; opponent is at top (positive Y) → move down
    const yOffset = YGOStatic.isPlayerPOV(player) ? 4 : -4;
    // Face-up rotation: player POV uses (0,0,0), opponent uses (0,0,π) to show face while keeping their orientation
    const targetRotation = YGOStatic.isPlayerPOV(player)
      ? new THREE.Euler(0, 0, 0)
      : new THREE.Euler(0, 0, Math.PI);

    cards.forEach((cardData, index) => {
      const cardReference = duel.ygo.state.getCardData(cardData.id);
      if (!cardReference) return;

      const handCard = gameHand.getCard(index);
      if (!handCard) return;

      const original = handCard.gameObject;
      startPositions.push(handCard.position.clone());
      startRotations.push(original.rotation.clone());
      originalObjects.push(original);

      const clone = new GameCard({ card: cardReference, duel });
      clone.hideCardStats();
      clone.gameObject.position.copy(handCard.position);
      clone.gameObject.rotation.copy(original.rotation);
      clones.push(clone);
    });

    if (clones.length === 0) {
      setTimeout(() => onCompleted());
      return;
    }

    sequence.add(new CallbackTransition(() => {
      gameHand.showHand = true;
      originalObjects.forEach(o => { o.visible = false; });
      playSound({ key: duel.createCdnUrl(`/sounds/reveal.ogg`), volume: 0.5 });
    }));

    // Animate all cards into view simultaneously
    const moveInTasks = clones.map((clone, i) => {
      const revealPos = startPositions[i].clone();
      revealPos.y += yOffset;
      return new MultipleTasks(
        new PositionTransition({
          gameObject: clone.gameObject,
          position: revealPos,
          duration: 0.4,
          ease: Ease.easeOutQuad,
        }),
        new RotationTransition({
          gameObject: clone.gameObject,
          rotation: targetRotation,
          duration: 0.35,
          ease: Ease.easeOutQuad,
        })
      );
    });

    sequence.add(new MultipleTasks(...moveInTasks));
    sequence.add(new WaitForSeconds(1.5));

    // Return all cards to original positions
    const moveOutTasks = clones.map((clone, i) => {
      return new MultipleTasks(
        new PositionTransition({
          gameObject: clone.gameObject,
          position: startPositions[i],
          duration: 0.3,
          ease: Ease.easeOutQuad,
        }),
        new RotationTransition({
          gameObject: clone.gameObject,
          rotation: startRotations[i],
          duration: 0.25,
          ease: Ease.easeOutQuad,
        })
      );
    });

    sequence.add(new MultipleTasks(...moveOutTasks));

    sequence.add(new CallbackTransition(() => {
      gameHand.showHand = originalShowHand;
      originalObjects.forEach(o => { o.visible = true; });
      clones.forEach(c => c.destroy());
      onCompleted();
    }));

    startTask(sequence);
  }
}
