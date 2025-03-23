import { DuelEventHandlerProps } from "..";
import { YGODuelEvents } from "ygo-core";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { MoveCardEventHandler } from "./move-card-event";

interface SendToGyEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.SendToGY;
}

export class SendToGyEventHandler extends YGOCommandHandler {
  private childCommand: YGOCommandHandler | undefined;

  constructor(private props: SendToGyEventHandlerProps) {
    super("send_card_to_gy_command");

    if (!this.props.event.reason) {
      this.childCommand = new MoveCardEventHandler(props as any);
    }
  }

  public start(): void {
    if (this.childCommand) {
      this.childCommand.start();
    } else {
      setTimeout(() => {
        this.props.onCompleted();
      });
    }
  }

  public finish(): void {
    if (this.childCommand) {
      this.childCommand.finish();
    }
  }
}
