import { YGODuelEvents } from "../../../../YGOCore";
import { getDuelEventHandler } from "../../../duel-events";
import { YGOComponent } from "../../YGOComponent";
import { YGODuel } from "../../YGODuel";
import { YGOTask } from "./YGOTask";

export enum YGOCommandsControllerState {
    PLAYING,
    RECOVER
}

export class YGOCommandsController extends YGOComponent {
    
    private state: YGOCommandsControllerState;
    private duel: YGODuel;
    private commands: YGOComponent[];
    private currentCommand: YGOComponent | undefined;
    private tasks: YGOTask[];

    constructor(duel: YGODuel) {
        super("duel_events_controller");
        this.duel = duel;
        this.commands = [];
        this.tasks = [];
        this.state = YGOCommandsControllerState.PLAYING;
        this.currentCommand = undefined;
    }

    start(): void {
        if (this.commands.length === 0) {
            this.commands.push()
        }
    }

    getState() {
        return this.state;
    }

    setState(state: YGOCommandsControllerState) {
        this.state = state;
    }

    isRecovering() {
        return this.state === YGOCommandsControllerState.RECOVER;
    }

    add(command: YGODuelEvents.DuelLog) {
        if (this.isRecovering()) return;

        const handler = getDuelEventHandler(command);

        this.duel.events.publish("disable-game-actions");

        const onCompleted = () => {
            this.currentCommand = undefined;
            this.processNextCommand();
        }

        const startTask = (task: YGOTask) => {
            this.tasks.push(task);
            this.duel.tasks.startTask(task);
            console.log("START TASK", task);
        }

        const props = {
            duel: this.duel,
            ygo: this.duel.ygo,
            event: command,
            startTask,
            onCompleted
        };

        this.commands.push(new handler(props));
        this.processNextCommand();
    }

    private processNextCommand() {
        if (this.currentCommand) return;

        if (this.commands.length === 0) {
            this.duel.updateField();
            this.duel.events.publish("enable-game-actions");
            this.duel.events.publish("commands-process-completed");
            return;
        }

        this.currentCommand = this.commands.shift();
        this.currentCommand?.start();
        this.duel.events.publish("commands-process-start");
    }

    update(dt?: number): void {
        this.currentCommand?.update(dt);
    }

    private completeCommands() {
        if (this.tasks.length > 0) {
            this.tasks.forEach(task => this.duel.tasks.completeTask(task));
            this.tasks = [];
        }
        this.currentCommand = undefined;
    }

    startRecover() {
        this.completeCommands();
        this.setState(YGOCommandsControllerState.RECOVER);
    }

    endRecover() {
        this.setState(YGOCommandsControllerState.PLAYING);
    }
}