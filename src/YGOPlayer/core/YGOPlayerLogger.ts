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
 * - `warn` is for the player's non-fatal console.warn diagnostics (a missing
 *   sound, a blocked autoplay, ...): it keeps that output and does not reach
 *   the hook, so hosts are not flooded with expected browser conditions.
 *
 * This is the only file in src/ allowed to call console directly (see the
 * no-console rule in eslint.config.js).
 */
export class YGOPlayerLogger {
  constructor(public onError?: YGOPlayerErrorHandler) { }

  swallowed(source: string, error: unknown, details?: unknown) {
    this.report(error, { source, details });
  }

  /** `error` may be omitted when there is no caught exception (an invariant
   * the player detected itself): only the message is printed, and the hook
   * receives an Error built from it. */
  error(source: string, message: string, error?: unknown, details?: unknown) {
    const args: unknown[] = [`${source}: ${message}`];
    if (details !== undefined) args.push(details);
    if (error !== undefined) args.push(error);
    console.error(...args);
    this.report(error !== undefined ? error : new Error(`${source}: ${message}`), { source, details });
  }

  warn(source: string, message: string, ...extra: unknown[]) {
    console.warn(`${source}: ${message}`, ...extra);
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
