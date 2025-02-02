import { YGOTask } from "../../core/components/tasks/YGOTask";

export class MultipleTasks extends YGOTask {

    private tasks: YGOTask[] = [];

    constructor(...tasks: YGOTask[]) {
        super();
        this.tasks = tasks;
    }

    public add(task: YGOTask): MultipleTasks {
        this.tasks.push(task);
        return this;
    }

    public start(): void {
        this.tasks.forEach(t => t.start());
    }

    public update(dt: number): void {
        for (const task of this.tasks) {
            if (task.isCompleted()) continue;
            task.update(dt)
        }

        const allCompleted = this.tasks.every(task => task.isCompleted());

        if (allCompleted) {
            this.completeTask();
        }
    }
}