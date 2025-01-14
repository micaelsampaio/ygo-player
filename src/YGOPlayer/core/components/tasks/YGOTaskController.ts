import { YGOComponent } from "../../YGOComponent";
import { YGODuel } from "../../YGODuel";
import { YGOTask } from "./YGOTask";

export class YGOTaskController extends YGOComponent {
    private duel: YGODuel;
    private tasks: YGOTask[] = [];

    constructor(duel: YGODuel) {
        super("duel_events_controller");
        this.duel = duel;
        this.tasks = [];
    }

    start(): void {

    }

    startTask(task: YGOTask) {
        task.start();
        this.tasks.push(task);
    }

    isProcessing() {
        return this.tasks.length > 0;
    }

    isEmpty() {
        return !this.isProcessing();
    }

    update(): void {
        const dt = this.duel.deltaTime;

        this.updateTasks(dt);
    }

    private updateTasks(dt: number) {
        if (this.tasks.length > 0) {
            for (let i = this.tasks.length - 1; i >= 0; --i) {
                this.tasks[i].update(dt);

                if (this.tasks[i].isCompleted()) {
                    this.tasks[i].finish();
                    this.tasks.splice(i, 1);
                }
            }
        }
    }

    complete() {
        if (this.tasks.length > 0) {

            let iterations = 100;
            const dt = 1;

            while (this.tasks.length > 0 && --iterations > 0) {
                this.updateTasks(dt);
            }

            if (this.tasks.length > 0) {
                // check if there are any current task
                console.error("YGO: THERE IS STILL TASKS ONGOING AFTER CLEAR TASKS");
            }
        }

        this.tasks = [];
    }
}