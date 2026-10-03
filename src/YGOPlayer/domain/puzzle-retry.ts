/** What the HUD hands its host for Try again (a new room: see ygo-socket-server puzzle:retry). */
export interface PuzzleRetryRequest {
  roomId: string;
  puzzleId: string;
  attempt: number;
}
