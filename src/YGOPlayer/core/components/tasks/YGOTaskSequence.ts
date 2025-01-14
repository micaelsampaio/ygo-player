import { YGOTask } from "./YGOTask";

export class YGOTaskSequence extends YGOTask {

    private tasks: YGOTask[] = [];
    private currentTask: YGOTask | undefined;

    public add(task: YGOTask): YGOTaskSequence {
        this.tasks.push(task);
        return this;
    }

    public start(): void {
        this.runNext();
    }

    public runNext() {
        if (this.currentTask) return;
        if (this.tasks.length === 0) return;

        this.currentTask = this.tasks.shift()!;
        this.currentTask.start();
    }

    public update(dt: number): void {
        if (this.currentTask) {
            this.currentTask.update(dt);

            if (this.currentTask.isCompleted()) {
                this.currentTask.finish();
                this.currentTask = undefined;
                this.runNext();
            }
        }

        if (!this.currentTask) {
            this.completeTask();
        }
    }

}