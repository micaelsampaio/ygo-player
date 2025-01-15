import { YGOTask } from "../../core/components/tasks/YGOTask";

export class WaitForSeconds extends YGOTask {
    private duration: number;

    constructor(duration: number) {
        super();
        this.duration = duration;
    }

    public update(dt: number): void {
        this.elapsedTime += dt;

        if (this.elapsedTime > this.duration) {
            this.completeTask();
        }
    }
}