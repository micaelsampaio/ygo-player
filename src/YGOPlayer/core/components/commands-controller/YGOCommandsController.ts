import { YGOCommandScope, YGODuelEvents } from "ygo-core";
import { YGOComponent } from "../../YGOComponent";
import { YGODuel } from "../../YGODuel";
import { YGOTask } from "../tasks/YGOTask";
import { ControllerCommand, ControllerCommandTag } from "./commands";
import { getDuelEventHandler } from "../../../duel-events";
import { YGOControllerCommands } from ".";

export enum YGOCommandsControllerState {
  IDLE = "idle",
  PLAYING = "playing",
  PLAYING_COMMAND = "playing_command"
}

export class YGOCommandsController extends YGOComponent {
  private state: YGOCommandsControllerState;
  private recovering: boolean;
  private duel: YGODuel;
  private tasks: YGOTask[];

  private commandsQueue: ControllerCommand[];
  private currentCommand: ControllerCommand | undefined;

  private pauseRequestedCommandId: boolean | number;
  private timerOnCompleteEvent: number;
  private timerToRequestNextCommand: number;
  private timerOnNextCommand: number;
  private timerToStartNewCommand: number;

  constructor(duel: YGODuel) {
    super("duel_events_controller");
    this.duel = duel;
    this.commandsQueue = [];
    this.tasks = [];
    this.state = YGOCommandsControllerState.IDLE;
    this.currentCommand = undefined;
    this.recovering = false;
    this.pauseRequestedCommandId = false;

    this.timerOnCompleteEvent = -1;
    this.timerOnNextCommand = -1;
    this.timerToStartNewCommand = -1;
    this.timerToRequestNextCommand = -1;
  }

  isRecovering() {
    return this.recovering;
  }

  isPlaying() {
    return this.state === YGOCommandsControllerState.PLAYING
      || this.state === YGOCommandsControllerState.PLAYING_COMMAND
      || this.currentCommand?.handler;
  }

  isLocked() {
    return (
      this.state === YGOCommandsControllerState.PLAYING ||
      this.state === YGOCommandsControllerState.PLAYING_COMMAND ||
      this.currentCommand?.handler ||
      this.isRecovering()
    );
  }

  getState() {
    return this.state;
  }

  setState(state: YGOCommandsControllerState) {
    this.state = state;
  }

  public play({ commandId }: { commandId: number }) {
    this.exec(new YGOControllerCommands.Play(this.duel, commandId));
  }

  public pause({ commandId }: { commandId: number }) {
    this.pauseRequestedCommandId = commandId;
  }

  public nextCommand({ commandId }: { commandId: number }) {
    this.exec(new YGOControllerCommands.Redo(this.duel, commandId))
  }

  public previousCommand({ commandId }: { commandId: number }) {
    this.exec(new YGOControllerCommands.Undo(this.duel, commandId))
  }

  public goToCommand({ commandId }: { commandId: number }) {
    this.exec(new YGOControllerCommands.Goto(this.duel, commandId))
  }

  exec(command: ControllerCommand) {
    clearTimeout(this.timerToRequestNextCommand);

    if (command.hasTag(ControllerCommandTag.EXEC_IMMEDIATLY)) {
      if (this.currentCommand) {
        this.finishCurrentCommand();
      }

      this.currentCommand = command;
      command.exec();

      if (!command.handler) {
        command.finish();
      }

      setTimeout(() => this.processNextCommand());
      return;
    }

    if (command.hasTag(ControllerCommandTag.GAME_EVENT_HANDLER)) {
      let index = 0;
      while (
        index < this.commandsQueue.length &&
        this.commandsQueue[index].hasTag(
          ControllerCommandTag.EXEC_IMMEDIATLY,
          ControllerCommandTag.GAME_EVENT_HANDLER
        )
      ) {
        ++index;
      }
      this.commandsQueue.splice(index, 0, command);
    } else {
      this.commandsQueue.push(command);
    }

    this.processNextCommand();
  }

  processNextCommand() {
    if (this.isRecovering()) return;
    if (this.currentCommand) { return; }

    if (this.commandsQueue.length === 0) {
      return this.onProcessesCompleted();
    }

    this.currentCommand = this.commandsQueue.shift();
    this.currentCommand?.exec();

    if (this.currentCommand?.handler) return;

    this.finishCurrentCommand();

    setTimeout(() => this.processNextCommand());
  }

  finishCurrentCommand() {
    this.currentCommand?.finish();
    this.currentCommand = undefined;
  }

  onProcessesCompleted() {
    if (Number.isInteger(this.pauseRequestedCommandId)) {
      if (this.duel.ygo.peek()?.commandId !== this.pauseRequestedCommandId) {
        const nextCommandId = this.pauseRequestedCommandId as number;
        this.startRecover(); // start recovers clear pause command id
        this.duel.ygo.goToCommand(nextCommandId as number);
        this.endRecover();
      }
      this.setState(YGOCommandsControllerState.IDLE);
      this.pauseRequestedCommandId = false;
    }

    if (this.state === YGOCommandsControllerState.PLAYING && this.duel.ygo.hasNextCommand()) {
      clearTimeout(this.timerToRequestNextCommand)
      if (this.duel.ygo.peek()?.scope === YGOCommandScope.GAME) {
        this.timerToRequestNextCommand = setTimeout(() => {
          if (this.duel.ygo.peek()?.scope === YGOCommandScope.GAME) {
            this.duel.serverActions.controls.play(); // keep playing
          }
        }, 100) as unknown as number;
      }
      return;
    }

    this.setState(YGOCommandsControllerState.IDLE);
    this.duel.updateField();
    this.duel.events.dispatch("enable-game-actions");
    this.duel.events.dispatch("commands-process-completed");
  }

  processYGOLog(log: YGODuelEvents.DuelLog) {
    this.clearTimers();

    if (this.isRecovering()) return;

    const handler = getDuelEventHandler(log);
    this.duel.events.dispatch("disable-game-actions");

    let isCommandCompleted = false;

    const onCompleted = () => {
      if (!this.enabled) return;
      if (isCommandCompleted) return;

      isCommandCompleted = true;

      if (this.isRecovering()) return;

      this.clearTimers();

      this.timerOnCompleteEvent = setTimeout(() => {
        this.finishCurrentCommand();
        this.processNextCommand();
      }) as unknown as number;
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
      event: log,
      playSound,
      startTask,
      onCompleted,
    };

    const handlerInstance = new handler(props);
    this.exec(new YGOControllerCommands.ExecCommandHandler(this.duel, handlerInstance))
  }


  update(dt?: number): void {
    this.currentCommand?.handler?.update(dt);
  }

  public clearRequestedPause() {
    this.pauseRequestedCommandId = false;
  }

  private clearTimers() {
    clearTimeout(this.timerOnCompleteEvent);
    clearTimeout(this.timerOnNextCommand);
    clearTimeout(this.timerToStartNewCommand);
    clearTimeout(this.timerToRequestNextCommand);
  }

  private clearCommandsState() { // complete pending commands
    this.clearTimers();

    this.currentCommand?.finish();
    this.currentCommand = undefined;

    if (this.tasks.length > 0) {
      this.tasks.forEach((task) => this.duel.tasks.completeTask(task));
      this.tasks = [];
    }

    while (this.commandsQueue.length > 0) {
      const cmd = this.commandsQueue.pop();
      cmd?.exec();
      cmd?.finish();
    }

    this.commandsQueue.length = 0;
  }

  public setRecoverState(state: boolean) {
    this.recovering = state;
    this.pauseRequestedCommandId = false;
  }

  public startRecover() {
    this.recovering = true;
    this.pauseRequestedCommandId = false;
    this.clearCommandsState();
    this.setState(YGOCommandsControllerState.IDLE);
  }

  public endRecover() {
    this.recovering = false;
    this.pauseRequestedCommandId = false;
  }

  public onDestroy(): void {
    this.clearTimers();
    this.clearCommandsState();
  }
}