import { YGOComponent } from "../YGOComponent";

export class YGOTaskManager extends YGOComponent {

    public commandTask: Generator | undefined;

    constructor() {
        super("tasks");
    }

    public start(): void {

    }

    public setCommandTask(task: Generator): void {
        this.commandTask = task;
    }

    public update(): void {
        if (this.commandTask) {
            const result = this.commandTask.next();

            if (result.done) {
                this.commandTask = undefined; // Clear the completed task
            }
        }
    }
}