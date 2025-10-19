import { YGOCommandHandler } from "../YGOCommandHandler";

export interface ControllerCommand {
  type: string
  handler: YGOCommandHandler | undefined
  exec(): void
  finish(): void
  hasTag(...tags: ControllerCommandTag[]): boolean
  addTag(...tags: ControllerCommandTag[]): void
}

export enum ControllerCommandTag {
  EXEC_IMMEDIATLY, // exec immediatly dont event enter in the queue
  GAME_EVENT_HANDLER // go to the start of the queue
}

export abstract class BaseControllerCommand {
  public type = "COMMAND_BASE"
  public handler: YGOCommandHandler | undefined
  public tags: Set<ControllerCommandTag> = new Set();

  public exec() {

  }

  public finish() {
    this.handler?.finish();
  }

  public hasTag(...tags: ControllerCommandTag[]) {
    return tags.some(tag => this.tags.has(tag));
  }

  public addTag(...tags: ControllerCommandTag[]) {
    tags.forEach(tag => this.tags.add(tag));
  }
}