import { DuelEventHandlerProps } from "..";
import { YGODuelEvents } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { CallbackTransition } from "../utils/callback";

interface DuelLifePointsEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.LifePoints;
}

export class DuelLifePointsEventHandler extends YGOCommandHandler {
  private props: DuelLifePointsEventHandlerProps;

  constructor(props: DuelLifePointsEventHandlerProps) {
    super("life_points_command");
    this.props = props;
  }

  public start(): void {
    const { onCompleted, startTask, playSound, event, duel } = this.props;

    duel.events.dispatch("duel-update-player-life-points", event);

    startTask(new YGOTaskSequence(
      new CallbackTransition(() => {
        playSound({ key: duel.createCdnUrl(`/sounds/life_points.ogg`), volume: 0.8 });
      }),
      new WaitForSeconds(0.4),
      new CallbackTransition(() => {
        onCompleted();
      }),
    ))
  }
}
