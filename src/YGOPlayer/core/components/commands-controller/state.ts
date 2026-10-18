/** Where the commands controller is in playback. Kept in its own module so the
 * controller commands (play/goto/undo/...) can read it without importing the
 * controller itself. */
export enum YGOCommandsControllerState {
  IDLE = "idle",
  PLAYING = "playing",
  PLAYING_COMMAND = "playing_command"
}
