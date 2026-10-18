import type { DuelEventHandlerProps } from "../types";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";

export class UpdateFieldEvent extends YGOCommandHandler {
    private timer: ReturnType<typeof setTimeout> | undefined;

    constructor(private props: DuelEventHandlerProps) {
        super("update_field_command");
        this.timer = undefined;
    }

    public start(): void {
        this.props.duel.updateField();

        this.timer = setTimeout(() => {
            this.props.onCompleted();
        }, 0);
    }

    public finish(): void {
        clearTimeout(this.timer);
    }
}
