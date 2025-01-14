import { YGOTask } from "../../core/components/tasks/YGOTask";

export class CallbackTransition extends YGOTask {
    private cb: Function;

    constructor(cb: Function) {
        super();
        this.cb = cb;
    }

    public start(): void {
        this.cb();
        this.completeTask();
    }
}