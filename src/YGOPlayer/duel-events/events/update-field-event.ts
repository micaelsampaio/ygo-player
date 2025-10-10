import { DuelEventHandlerProps } from "..";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";

export class UpdateFieldEvent extends YGOCommandHandler {
    private timer: number;

    constructor(private props: DuelEventHandlerProps) {
        super("update_field_command");
        this.timer = -1;
    }

    public start(): void {
        this.props.duel.updateField();

        this.timer = setTimeout(() => {
            this.props.onCompleted();
        }, 0) as unknown as number;
    }

    public finish(): void {
        clearTimeout(this.timer);
    }
}
