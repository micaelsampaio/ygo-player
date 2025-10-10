export class YGOTimerUtils {
  private timers: number[] = []

  setTimeout(callback: () => void, delay?: number) {
    const timer = setTimeout(() => {
      this.timers = this.timers.filter(t => t !== timer);
      callback();
    }, delay || 0) as unknown as number;
    this.timers.push(timer);
    return timer;
  }

  requestAnimationFrame(callback: () => void) {
    const timer = requestAnimationFrame(() => {
      this.timers = this.timers.filter(t => t !== timer);
      callback();
    }) as unknown as number;
    this.timers.push(timer);
    return timer;
  }

  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.forEach(timer => cancelAnimationFrame(timer));
    this.timers = [];
  }

  clearTimer(timerId: number) {
    clearTimeout(timerId);
    cancelAnimationFrame(timerId);
    this.timers = this.timers.filter(t => t !== timerId);
  }
}
