import { DuelEventHandlerProps } from "..";
import { YGODuelEvents } from "../../../YGOCore";
import { YGOComponent } from "../../core/YGOComponent";
import { MoveCardEventHandler } from "./move-card-event";

interface SendToGyEventHandlerProps extends DuelEventHandlerProps {
    event: YGODuelEvents.SendToGY
}

export class SendToGyEventHandler extends YGOComponent {
    private childCommand: YGOComponent | undefined;

    constructor(private props: SendToGyEventHandlerProps) {
        super("send_card_to_gy_command");
        console.log("GY >>", this.props.event);

        if (!this.props.event.reason) {
            alert(this.props.event.reason);
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
}