import { DuelEventHandlerProps } from "..";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";

export class UpdateFieldEvent extends YGOCommandHandler {

    constructor(private props: DuelEventHandlerProps) {
        super("update_field_command");
    }

    public start(): void {
        this.props.duel.updateField();
        this.props.onCompleted();
    }
}
