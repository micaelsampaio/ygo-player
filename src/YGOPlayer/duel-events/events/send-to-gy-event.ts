import { DuelEventHandlerProps } from "..";
import { YGODuelEvents } from "ygo-core";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { MoveCardEventHandler } from "./move-card-event";
import { YGOTimerUtils } from "../../scripts/timer-utils";

interface SendToGyEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.SendToGY;
}

export class SendToGyEventHandler extends YGOCommandHandler {
  private childCommand: YGOCommandHandler | undefined;
  private timers: YGOTimerUtils;

  constructor(private props: SendToGyEventHandlerProps) {
    super("send_card_to_gy_command");
    this.timers = new YGOTimerUtils();

    if (!this.props.event.reason) {
      this.childCommand = new MoveCardEventHandler(props as any);
    }
  }

  public start(): void {
    if (this.childCommand) {
      this.childCommand.start();
    } else {
      this.timers.setTimeout(() => {
        this.props.onCompleted();
      });
    }
  }

  public finish(): void {
    if (this.childCommand) {
      this.childCommand.finish();
    }
    this.timers.clear();
  }
}
