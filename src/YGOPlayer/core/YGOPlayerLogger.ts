/** Where in the player an error was caught, e.g. "YGODuel.destroyDuelInstance". */
export interface YGOPlayerErrorContext {
  source: string;
  /** Extra data useful to diagnose the error (the skipped command, ...). */
  details?: unknown;
}

/** Host-provided hook (YGOConfig.onError) that sees every error the player
 * catches and recovers from, so desyncs and failed teardowns become visible. */
export type YGOPlayerErrorHandler = (error: unknown, context: YGOPlayerErrorContext) => void;

/**
 * Small error reporter. It never rethrows and never prints more than the
 * player did before it existed:
 * - `swallowed` is for errors the player deliberately ignores: no console
 *   output, only the host's onError hook.
 * - `error` is for errors the player already logged with console.error: it
 *   keeps that output and also reports to the hook.
 */
export class YGOPlayerLogger {
  constructor(public onError?: YGOPlayerErrorHandler) { }

  swallowed(source: string, error: unknown, details?: unknown) {
    this.report(error, { source, details });
  }

  error(source: string, message: string, error: unknown, details?: unknown) {
    if (details === undefined) console.error(`${source}: ${message}`, error);
    else console.error(`${source}: ${message}`, details, error);
    this.report(error, { source, details });
  }

  private report(error: unknown, context: YGOPlayerErrorContext) {
    if (!this.onError) return;
    try {
      this.onError(error, context);
    } catch {
      // A failing host hook must not break the player.
    }
  }
}
