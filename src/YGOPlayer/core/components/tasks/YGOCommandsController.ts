import { Command, YGODuelEvents } from "ygo-core";
import { getDuelEventHandler } from "../../../duel-events";
import { YGOComponent } from "../../YGOComponent";
import { YGODuel } from "../../YGODuel";
import { YGOCommandHandler } from "../YGOCommandHandler";
import { YGOTask } from "./YGOTask";

export enum YGOCommandsControllerState {
  IDLE = "idle",
  PLAYING = "playing",
  PLAYING_COMMAND = "playing_command",
  RECOVER = "recover",
}

export class YGOCommandsController extends YGOComponent {
  private state: YGOCommandsControllerState;
  private duel: YGODuel;
  private commands: YGOCommandHandler[];
  private currentCommand: YGOCommandHandler | undefined;
  private tasks: YGOTask[];
  private timerOnCompleteEvent: number;
  private timerOnNextCommand: number;
  private pauseRequested = false;

  constructor(duel: YGODuel) {
    super("duel_events_controller");
    this.duel = duel;
    this.commands = [];
    this.tasks = [];
    this.state = YGOCommandsControllerState.IDLE;
    this.currentCommand = undefined;

    this.timerOnCompleteEvent = -1;
    this.timerOnNextCommand = -1;
  }

  start(): void { }

  getState() {
    return this.state;
  }

  setState(state: YGOCommandsControllerState) {
    this.state = state;
  }

  play() {
    if (this.isLocked()) return;
    if (!this.duel.ygo.hasNextCommand()) return;

    this.setState(YGOCommandsControllerState.PLAYING);
    this.pauseRequested = false;
    this.duel.ygo.redo();
    this.duel.clearActions();
  }

  nextCommand() {
    if (this.isLocked()) return;
    if (!this.duel.ygo.hasNextCommand()) return;
    this.setState(YGOCommandsControllerState.PLAYING_COMMAND);
    this.pauseRequested = false;
    this.duel.ygo.redo();
    this.duel.clearActions();
  }

  previousCommand() {
    this.startRecover();

    if (this.duel.ygo.hasPrevCommand()) {
      this.duel.ygo.undo();
    }

    this.duel.clearActions();
    this.duel.updateField();
    this.endRecover();
  }

  goToCommand(command: Command) {
    this.startRecover();
    this.duel.ygo.goToCommand(command);
    this.duel.updateField();
    this.duel.clearActions();
    this.endRecover();
  }

  pause() {
    this.pauseRequested = true;
    clearTimeout(this.timerOnNextCommand);
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
    clearTimeout(this.timerOnCompleteEvent);
    clearTimeout(this.timerOnNextCommand);
    const handler = getDuelEventHandler(command);
    this.duel.events.dispatch("disable-game-actions");

    const onCompleted = () => {
      clearTimeout(this.timerOnCompleteEvent);
      this.timerOnCompleteEvent = setTimeout(() => {
        this.currentCommand?.finish();
        this.currentCommand = undefined;
        this.processNextCommand();
      }, 10) as any as number;
    };

    const startTask = (task: YGOTask) => {
      this.tasks.push(task);
      this.duel.tasks.startTask(task, {
        onCompleted: () => {
          this.tasks = this.tasks.filter(t => t !== task);
        }
      });
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
    if (this.currentCommand) return; // there is already a command to be executed

    this.duel.clearActions();

    if (this.commands.length === 0) { // will try to play next command
      if (this.state === YGOCommandsControllerState.PLAYING && !this.pauseRequested) {
        if (this.duel.ygo.hasNextCommand()) {
          clearTimeout(this.timerOnNextCommand);
          this.timerOnNextCommand = setTimeout(() => {
            this.duel.ygo.redo();
          }, 250) as any as number;
          return;
        }
      }
      return this.onAllCommandsProcessed();
    }

    this.currentCommand = this.commands.shift();
    this.currentCommand?.start();
    this.duel.events.dispatch("commands-process-start");
  }

  private onAllCommandsProcessed() {
    this.setState(YGOCommandsControllerState.IDLE);
    this.duel.updateField();
    this.duel.events.dispatch("enable-game-actions");
    this.duel.events.dispatch("commands-process-completed");
  }

  update(dt?: number): void {
    this.currentCommand?.update(dt);
  }

  private clearCommandsState() { // complete pending commands

    if (this.tasks.length > 0) {
      this.tasks.forEach((task) => this.duel.tasks.completeTask(task));
      this.tasks = [];
    }

    this.currentCommand?.finish();
    this.currentCommand = undefined;
  }

  startRecover() {
    this.clearCommandsState();
    this.pauseRequested = false;
    this.setState(YGOCommandsControllerState.RECOVER);
  }

  endRecover() {
    this.setState(YGOCommandsControllerState.IDLE);
    this.pauseRequested = false;
  }

  public onDestroy(): void {
    clearTimeout(this.timerOnCompleteEvent);
    clearTimeout(this.timerOnNextCommand);
  }
}
