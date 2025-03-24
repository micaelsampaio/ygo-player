import { YGODuelEvents } from "ygo-core";
import { getDuelEventHandler } from "../../../duel-events";
import { YGOComponent } from "../../YGOComponent";
import { YGODuel } from "../../YGODuel";
import { YGOCommandHandler } from "../YGOCommandHandler";
import { YGOTask } from "./YGOTask";

export enum YGOCommandsControllerState {
  IDLE,
  PLAYING,
  PLAYING_COMMAND,
  RECOVER,
}

export class YGOCommandsController extends YGOComponent {
  private state: YGOCommandsControllerState;
  private duel: YGODuel;
  private commands: YGOCommandHandler[];
  private currentCommand: YGOCommandHandler | undefined;
  private tasks: YGOTask[];

  constructor(duel: YGODuel) {
    super("duel_events_controller");
    this.duel = duel;
    this.commands = [];
    this.tasks = [];
    this.state = YGOCommandsControllerState.IDLE;
    this.currentCommand = undefined;
  }

  start(): void { }

  getState() {
    return this.state;
  }

  setState(state: YGOCommandsControllerState) {
    this.state = state;
  }

  play() {
    this.setState(YGOCommandsControllerState.PLAYING);
  }

  playNextCommand() {
    this.setState(YGOCommandsControllerState.PLAYING_COMMAND);
  }

  pause() {
    this.setState(YGOCommandsControllerState.IDLE);
  }

  isRecovering() {
    return this.state === YGOCommandsControllerState.RECOVER;
  }

  isPlaying() {
    return this.state === YGOCommandsControllerState.PLAYING
      || this.state === YGOCommandsControllerState.PLAYING_COMMAND;
  }

  isLocked() {
    return (
      this.state === YGOCommandsControllerState.PLAYING ||
      this.state === YGOCommandsControllerState.PLAYING_COMMAND ||
      this.state === YGOCommandsControllerState.RECOVER
    );
  }

  add(command: YGODuelEvents.DuelLog) {
    const handler = getDuelEventHandler(command);

    this.duel.events.dispatch("disable-game-actions");

    const onCompleted = () => {
      this.currentCommand = undefined;
      this.processNextCommand();
    };

    const startTask = (task: YGOTask) => {
      this.tasks.push(task);
      this.duel.tasks.startTask(task);
    };

    const props = {
      duel: this.duel,
      ygo: this.duel.ygo,
      event: command,
      startTask,
      onCompleted,
    };

    this.commands.push(new handler(props));
    this.processNextCommand();
  }

  private processNextCommand() {
    if (this.currentCommand) {
      this.setState(YGOCommandsControllerState.IDLE);
      return;
    };

    if (this.commands.length === 0) {
      if (!this.isPlaying()) this.setState(YGOCommandsControllerState.IDLE);
      if (this.state === YGOCommandsControllerState.PLAYING_COMMAND) this.setState(YGOCommandsControllerState.IDLE);

      this.duel.updateField();
      this.duel.events.dispatch("enable-game-actions");
      this.duel.events.dispatch("commands-process-completed");
      return;
    }

    this.currentCommand = this.commands.shift();
    this.currentCommand?.start();
    this.duel.events.dispatch("commands-process-start");
  }

  update(dt?: number): void {
    this.currentCommand?.update(dt);
  }

  private completeCommands() {
    if (this.tasks.length > 0) {
      this.tasks.forEach((task) => this.duel.tasks.completeTask(task));
      this.tasks = [];
    }
    this.currentCommand?.finish();
    this.currentCommand = undefined;
  }

  startRecover() {
    this.completeCommands();
    this.setState(YGOCommandsControllerState.RECOVER);
  }

  endRecover() {
    this.setState(YGOCommandsControllerState.IDLE);
  }
}
