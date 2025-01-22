import { YGOComponent } from "../../YGOComponent";
import { YGODuel } from "../../YGODuel";
import { YGOTask } from "./YGOTask";

interface TaskEvents {
    onCompleted?: (task: YGOTask) => void
}

export class YGOTaskController extends YGOComponent {
    private duel: YGODuel;
    private tasks: { task: YGOTask, events: TaskEvents | undefined }[] = [];

    constructor(duel: YGODuel) {
        super("duel_events_controller");
        this.duel = duel;
        this.tasks = [];
    }

    start(): void {

    }

    startTask(task: YGOTask, events?: TaskEvents) {
        task.start();
        this.tasks.push({ task, events });
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
                const task = this.tasks[i].task;
                task.update(dt);

                if (task.isCompleted()) {
                    task.finish();
                    this.tasks[i].events?.onCompleted!(task);
                    this.tasks.splice(i, 1);
                }
            }
        }
    }

    completeTask(task: YGOTask) {
        let iterations = 1000;
        while (--iterations > 0) {
            task.update(1);

            if (task.isCompleted()) {
                task.finish();
                const i = this.tasks.findIndex(t => t.task === task);
                if (i !== -1) {
                    this.tasks[i].events?.onCompleted!(task);
                    this.tasks.splice(i, 1);
                }

                break;
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