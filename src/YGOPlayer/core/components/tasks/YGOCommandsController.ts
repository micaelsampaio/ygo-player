import { Command, JSONCommand, YGOCommands, YGOCommandScope, YGODuelEvents } from "ygo-core";
import { getDuelEventHandler } from "../../../duel-events";
import { YGOComponent } from "../../YGOComponent";
import { YGODuel } from "../../YGODuel";
import { YGOCommandHandler } from "../YGOCommandHandler";
import { YGOTask } from "./YGOTask";

export enum YGOCommandsControllerState {
  IDLE = "idle",
  PLAYING = "playing",
  PLAYING_COMMAND = "playing_command"
}

export class YGOCommandsController extends YGOComponent {
  private state: YGOCommandsControllerState;
  private recovering: boolean;
  private duel: YGODuel;
  private commands: YGOCommandHandler[];
  private currentCommand: YGOCommandHandler | undefined;
  private tasks: YGOTask[];
  private timerOnCompleteEvent: number;
  private timerOnNextCommand: number;
  private pauseRequested = false;
  private commandsToExecuteQueue: Command[];

  constructor(duel: YGODuel) {
    super("duel_events_controller");
    this.duel = duel;
    this.commands = [];
    this.tasks = [];
    this.state = YGOCommandsControllerState.IDLE;
    this.currentCommand = undefined;
    this.recovering = false;
    this.commandsToExecuteQueue = [];

    this.timerOnCompleteEvent = -1;
    this.timerOnNextCommand = -1;
  }

  exec({ command }: { command: Command | string }) {
    const alreadyPlaying = this.isPlaying();

    this.setState(YGOCommandsControllerState.PLAYING);

    if (typeof command === "string") {
      const cmd = new JSONCommand(JSON.parse(command));
      if (alreadyPlaying) {
        return this.commandsToExecuteQueue.push(cmd)
      }
      this.duel.ygo.exec(cmd);

      if (cmd.scope !== YGOCommandScope.GAME) {
        this.onAllCommandsProcessed();
      }
    } else {
      if (alreadyPlaying) {
        return this.commandsToExecuteQueue.push(command)
      }
      this.duel.ygo.exec(command);

      if (command.scope !== YGOCommandScope.GAME) {
        this.onAllCommandsProcessed();
      }
    }
  }

  getState() {
    return this.state;
  }

  setState(state: YGOCommandsControllerState) {
    this.state = state;
  }

  play() {
    if (this.isRecovering()) return;
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
      this.setState(YGOCommandsControllerState.IDLE);
      this.duel.ygo.undo();
    }

    this.duel.clearActions();
    this.duel.updateField();
    this.endRecover();
  }

  goToCommand(command: Command | number) {
    this.startRecover();
    this.setState(YGOCommandsControllerState.IDLE);
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
    return this.recovering;
  }

  isPlaying() {
    return this.state === YGOCommandsControllerState.PLAYING
      || this.state === YGOCommandsControllerState.PLAYING_COMMAND;
  }

  isLocked() {
    return (
      this.state === YGOCommandsControllerState.PLAYING ||
      this.state === YGOCommandsControllerState.PLAYING_COMMAND ||
      this.isRecovering()
    );
  }

  add(command: YGODuelEvents.DuelLog) {
    clearTimeout(this.timerOnCompleteEvent);
    clearTimeout(this.timerOnNextCommand);
    const handler = getDuelEventHandler(command);
    this.duel.events.dispatch("disable-game-actions");

    let isCommandCompleted = false;

    const onCompleted = () => {
      if (isCommandCompleted) return;

      isCommandCompleted = true;
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

    const playSound = (options: {
      key: string;
      layer?: string;
      volume?: number;
      loop?: boolean;
      onComplete?: () => void;
    }) => {
      // TODO SAVE CURRENT SOUNDS PLAYING
      this.duel.soundController.playSound(options);
    }

    const props = {
      duel: this.duel,
      ygo: this.duel.ygo,
      event: command,
      playSound,
      startTask,
      onCompleted,
    };

    this.commands.push(new handler(props));
    this.processNextCommand();
  }

  private processNextCommand() {
    // there is already a command to be executed
    if (this.currentCommand) return;

    this.duel.clearActions();

    if (this.commands.length === 0) { // will try to play next command
      if (this.state === YGOCommandsControllerState.PLAYING && !this.pauseRequested) {
        if (this.duel.ygo.hasNextCommand()) {
          clearTimeout(this.timerOnNextCommand);

          this.duel.updateField();
          this.timerOnNextCommand = setTimeout(() => {
            // this.duel.ygo.redo();
            this.duel.serverActions.controls.play();
          }, 100) as any as number;
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

    if (this.commandsToExecuteQueue.length > 0) {
      return this.executeCommandInQueue();
    }

    this.setState(YGOCommandsControllerState.IDLE);
    this.duel.updateField();
    this.duel.events.dispatch("enable-game-actions");
    this.duel.events.dispatch("commands-process-completed");
  }

  private executeCommandInQueue() {
    const command = this.commandsToExecuteQueue.pop();
    if (!command) return;

    this.duel.ygo.exec(command);

    if (command.scope !== YGOCommandScope.GAME) {
      this.currentCommand = undefined;
      this.onAllCommandsProcessed();
    }
  }

  update(dt?: number): void {
    this.currentCommand?.update(dt);
  }

  private clearCommandsState() { // complete pending commands
    clearTimeout(this.timerOnNextCommand);

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
    this.recovering = true;
  }

  endRecover() {
    this.recovering = false;
    this.pauseRequested = false;
  }

  public onDestroy(): void {
    clearTimeout(this.timerOnCompleteEvent);
    clearTimeout(this.timerOnNextCommand);
  }
}