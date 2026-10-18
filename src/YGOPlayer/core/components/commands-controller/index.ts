import { ExecCommandHandler } from "./exec-command-handler";
import { Exec } from "./exec";
import { Goto } from "./goto";
import { Play } from "./play";
import { Redo } from "./redo";
import { Undo } from "./undo";

export { YGOCommandsControllerState } from "./state";

export const YGOControllerCommands = {
  ExecCommandHandler,
  Exec,
  Undo,
  Redo,
  Goto,
  Play
}