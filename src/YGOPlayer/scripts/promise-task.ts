export class PromiseTask {

  private tasks: number;
  private completedTasks: number;
  private promise: Promise<void>;
  private completed: boolean = false;
  private resolve!: () => void;
  private reject!: () => void;

  constructor() {
    this.tasks = 0;
    this.completedTasks = 0;
    this.promise = new Promise((resolve, reject) => {
      this.resolve = () => {
        if (!this.completed) {
          this.completed = true;
          resolve();
        }
      };
      this.reject = () => {
        if (!this.completed) {
          this.completed = true;
          reject();
        }
      };
    });
  }

  registerTask() {
    this.tasks++;
  }

  completeTask() {
    this.completedTasks++;
    if (this.completedTasks === this.tasks) {
      this.resolve();
    }
  }

  cancelTask() {
    this.reject();
  }

  wait(): Promise<void> {
    return this.promise;
  }
}
