import { Queue } from "../../scripts/queue";
import { YGOComponent } from "../YGOComponent";
import { YGODuel } from "../YGODuel";

export class YGOTaskController extends YGOComponent {
    private duel: YGODuel;
    private events: Queue<any>;
    private immediateEvents: any[];

    private currentEvent: any | null;

    constructor(duel: YGODuel) {
        super("duel_events_controller");
        this.duel = duel;
        this.events = new Queue();
        this.immediateEvents = [];
        this.currentEvent = null;
    }

    public start(): void {

    }

    process(event: any) {
        if (this.events.isEmpty()) {
            this.currentEvent = event;
        } else {
            this.events.enqueue(event);
        }
    }

    processNow(event: any) {
        this.immediateEvents.push(event);
    }

    isProcessing() {
        return !!this.currentEvent || this.immediateEvents.length > 0;
    }

    isEmpty() {
        return !this.isProcessing();
    }

    update(): void {
        if (this.currentEvent) {
            const result = this.currentEvent.next();
            if (result.done) {
                this.currentEvent = this.events.dequeue();
            }
        }

        if (this.immediateEvents.length > 0) {
            for (let i = this.immediateEvents.length; i >= 0; --i) {
                const result = this.immediateEvents[i].next();
                if (result.done) {
                    this.immediateEvents.splice(i, 1);
                }
            }
        }
    }

    complete() {
        const prevDeltaTime = this.duel.deltaTime;
        this.duel.deltaTime = 1;

        if (this.currentEvent) {
            while (!this.currentEvent.done) {
                this.currentEvent.next()
            }
        }

        for (let i = 0; this.immediateEvents.length; ++i) {
            while (!this.immediateEvents[i].done) {
                this.immediateEvents[i].next();
            }
        }

        this.duel.deltaTime = prevDeltaTime;
        this.currentEvent = null;
        this.immediateEvents = [];
    }
}