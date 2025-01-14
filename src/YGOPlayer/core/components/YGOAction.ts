
export class YGOActionManager {
    public enabled: boolean;
    public action: YGOAction;
    public actions: Map<string, YGOAction>;
    private defaultAction = new IdleAction();
    public onActionTransition: ((prevAction: YGOAction, action: YGOAction) => void) | null;
    public onChangeAction: ((action: YGOAction) => void) | null;

    constructor() {
        this.enabled = true;
        this.action = this.defaultAction;
        this.actions = new Map();
        this.onChangeAction = null;
        this.onActionTransition = null;
    }

    setAction(action: YGOAction = this.defaultAction) {
        if (!this.enabled) return;

        const prevAction = this.action;
        console.log("SET ACTION ----------");
        console.log("PREV::", prevAction);
        this.action = action;
        console.log("NEW::", this.action);

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
}

export interface YGOAction {
    name: string
    onActionStart?: () => void
    onActionEnd?: () => void
    onActionResume?: () => void
}

class IdleAction implements YGOAction {
    name: string = "IDLE";
}
