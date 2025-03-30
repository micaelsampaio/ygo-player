import { YGOComponent } from "../YGOComponent";

export class YGOActionManager extends YGOComponent {
    public actionsEnabled: boolean;
    public action: YGOAction;
    public actions: Map<string, YGOAction>;
    private defaultAction = new IdleAction();
    public onActionTransition: ((prevAction: YGOAction, action: YGOAction) => void) | null;
    public onChangeAction: ((action: YGOAction) => void) | null;

    constructor() {
        super("actions_manager");
        
        this.actionsEnabled = true;
        this.action = this.defaultAction;
        this.actions = new Map();
        this.onChangeAction = null;
        this.onActionTransition = null;
    }

    setAction(action: YGOAction = this.defaultAction) {
        if (!this.actionsEnabled) return;

        const prevAction = this.action;
        this.action = action;

        if (prevAction?.onActionEnd) prevAction.onActionEnd();
        if (this.action.onActionStart) this.action.onActionStart();

        if (this.onActionTransition) this.onActionTransition(prevAction, this.action);
        if (this.onChangeAction) this.onChangeAction(this.action);
    }

    setActionByName(action: string) {
        this.setAction(this.getAction(action));
    }

    clearAction() {
        this.setAction(this.defaultAction);
    }

    getAction<T = YGOAction>(name: string) {
        return this.actions.get(name) as T;
    }

    update(dt: number) {
        if (this.action?.updateAction) this.action.updateAction(dt);
    }
}

export interface YGOAction {
    name: string
    uncancellable?: boolean
    onActionStart?: () => void
    onActionEnd?: () => void
    onActionResume?: () => void
    updateAction?: (dt: number) => void
}

class IdleAction implements YGOAction {
    name: string = "IDLE";
}
