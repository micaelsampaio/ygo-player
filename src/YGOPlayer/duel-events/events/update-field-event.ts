import { DuelEventHandlerProps } from "..";
import { YGOComponent } from "../../core/YGOComponent";

export class UpdateFieldEvent extends YGOComponent {

    constructor(private props: DuelEventHandlerProps) {
        super("update_field_command");
    }

    public start(): void {
        this.props.duel.updateField();
        this.props.onCompleted();
    }
}
