import { YGOCommandScope, YGODuelEvents } from "ygo-core";
import { YGOComponent } from "../../YGOComponent";
import type { YGODuel } from "../../YGODuel";
import type { YGOTask } from "../tasks/YGOTask";
import { ControllerCommand, ControllerCommandTag } from "./commands";
import { getDuelEventHandler } from "../../../duel-events";
import { YGOCommandsControllerState } from "./state";
import { ExecCommandHandler } from "./exec-command-handler";
import { Goto } from "./goto";
import { Play } from "./play";
import { Redo } from "./redo";
import { Undo } from "./undo";

export { YGOCommandsControllerState };

export class YGOCommandsController extends YGOComponent {
  private state: YGOCommandsControllerState;
  private recovering: boolean;
  private duel: YGODuel;
  private tasks: YGOTask[];

  private commandsQueue: ControllerCommand[];
  private currentCommand: ControllerCommand | undefined;

  private pauseRequestedCommandId: boolean | number;
  private timerOnCompleteEvent: ReturnType<typeof setTimeout> | undefined;
  private timerToRequestNextCommand: ReturnType<typeof setTimeout> | undefined;
  private timerOnNextCommand: ReturnType<typeof setTimeout> | undefined;
  private timerToStartNewCommand: ReturnType<typeof setTimeout> | undefined;

  constructor(duel: YGODuel) {
    super("duel_events_controller");
    this.duel = duel;
    this.commandsQueue = [];
    this.tasks = [];
    this.state = YGOCommandsControllerState.IDLE;
    this.currentCommand = undefined;
    this.recovering = false;
    this.pauseRequestedCommandId = false;

    this.timerOnCompleteEvent = undefined;
    this.timerOnNextCommand = undefined;
    this.timerToStartNewCommand = undefined;
    this.timerToRequestNextCommand = undefined;
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

  /** A command is animating, or more are queued (between two commands the
   * current one is briefly unset while the next waits on a setTimeout). */
  isBusy() {
    return !!this.isLocked() || this.commandsQueue.length > 0;
  }

  getState() {
    return this.state;
  }

  setState(state: YGOCommandsControllerState) {
    this.state = state;
  }

  public play({ commandId }: { commandId: number }) {
    this.exec(new Play(this.duel, commandId));
  }

  public pause({ commandId }: { commandId: number }) {
    this.pauseRequestedCommandId = commandId;
  }

  public nextCommand({ commandId }: { commandId: number }) {
    this.exec(new Redo(this.duel, commandId))
  }

  public previousCommand({ commandId }: { commandId: number }) {
    this.exec(new Undo(this.duel, commandId))
  }

  public goToCommand({ commandId }: { commandId: number }) {
    this.exec(new Goto(this.duel, commandId))
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
        this.finishCurrentCommand();
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
    try {
      this.currentCommand?.exec();
    } catch (error) {
      // A single malformed/desynced command (e.g. a mirrored server log
      // entry referencing a card that isn't actually in the zone the
      // client's local state has for it) must not freeze the whole duel —
      // exec() throws before mutating anything for a command like this
      // (the lookup that fails is always the first thing it does), so it's
      // safe to just skip it and keep processing rather than let this
      // propagate uncaught and halt command processing — and every
      // control in the UI with it — forever.
      // Reported through the host's onError hook too, so a skipped command (a desync) is visible.
      this.duel.logger.error("YGOCommandsController", "command exec failed, skipping it", error, this.currentCommand);
      this.finishCurrentCommand();
      setTimeout(() => this.processNextCommand());
      return;
    }

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
      this.timerToRequestNextCommand = setTimeout(() => {
        this.duel.serverActions.controls.play(); // keep playing
      }, 100);
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
      });
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

    // The log is dispatched from inside the core's command exec: a handler
    // that throws here would abort that command half-way (its later steps,
    // the hidden-info update), so the live board drifts from the server's.
    // Only the animation is skipped; the board is redrawn from the core's
    // state once the queue empties (onProcessesCompleted → updateField).
    let handlerInstance: InstanceType<typeof handler>;
    try {
      handlerInstance = new handler(props);
    } catch (error) {
      this.duel.logger.error("YGOCommandsController", "duel log handler failed, skipping its animation", error, log);
      return;
    }
    this.exec(new ExecCommandHandler(this.duel, handlerInstance))
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
      const cmd = this.commandsQueue.shift(); // FIFO — keep server order
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

  public clearCommandsQueue() {
    this.clearTimers();
    if (this.currentCommand) {
      this.currentCommand.finish();
      this.currentCommand = undefined;
    }
    if (this.tasks.length > 0) {
      this.tasks.forEach((task) => this.duel.tasks.completeTask(task));
      this.tasks = [];
    }
    this.commandsQueue.length = 0;
  }

  public onDestroy(): void {
    this.clearTimers();
    this.clearCommandsState();
  }
}