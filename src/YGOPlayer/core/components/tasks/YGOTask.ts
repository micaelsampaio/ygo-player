export abstract class YGOTask {
    private completed: boolean = false;
    public elapsedTime: number = 0;

    public start() {

    }

    public update(dt: number) {

    }

    public finish() {

    }

    protected completeTask(): void {
        this.completed = true;
    }

    public isCompleted(): boolean {
        return this.completed;
    }
}