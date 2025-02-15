import { YGOTask } from "../../core/components/tasks/YGOTask";

export class UpdateTask extends YGOTask {
    private startFunc: (() => void) | undefined
    private updateFunc: (dt: number) => void
    private finishFunc: (() => void) | undefined

    constructor({ onStart, onUpdate, onFinish }: { onStart?: () => void, onUpdate: (dt: number) => void, onFinish?: () => void }) {
        super();
        this.startFunc = onStart;
        this.updateFunc = onUpdate;
        this.finishFunc = onFinish;
    }

    public start(): void {
        if (this.startFunc) this.startFunc();
    }

    public update(dt: number) {
        this.updateFunc(dt);
    }

    public finish(): void {
        if (this.finishFunc) {
            this.finishFunc();
        }
    }

    public setTaskCompleted() {
        this.completeTask();
    }
}