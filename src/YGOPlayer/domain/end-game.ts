/** Next-step buttons the end-of-duel overlay can offer. The host (ygo101-web)
 * opts in to each one via `endGameActions` and handles the click through the
 * web component's "end-game-action" event — what "rematch" or "the lobby"
 * means depends entirely on how the duel was started. */
export type YGOEndGameAction = "save-replay" | "rematch" | "back-to-lobby";
