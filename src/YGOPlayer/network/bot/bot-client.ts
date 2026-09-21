import { YGOClient, YGOClientType } from "ygo-core";

/**
 * A bot has no separate "UI consumer" the way LocalYGOPlayerClient does (no
 * human ever calls .send()/.onMessage() on it from outside), so unlike the
 * human client/communication-twin pair it doesn't need the extra split —
 * this single class IS the server's view of the client directly.
 *
 * `send()` (server -> client broadcasts) is a required part of the
 * YGOClient interface but otherwise unused: BotController reads
 * decision-relevant state directly off the shared, authoritative YGOCore
 * (see BotController.attachGame) rather than reconstructing it from this
 * broadcast stream — reading the single source of truth directly is
 * simpler and can't desync, unlike a hand-rolled mirror (see Stage 0's
 * turn-flip bug, caught while building the version that DID try to mirror
 * this purely from broadcasts).
 *
 * `onMessage(cb)` is called ONCE by the server to register its own
 * handler for messages FROM this client; `emit()` is how the bot (via
 * BotController) invokes that handler to actually send a command.
 */
export class BotYGOPlayerClient implements YGOClient {
  public type: YGOClientType = YGOClientType.PLAYER;
  public username: string;
  private onMessageCb?: (eventName: string, data?: any) => void;
  private onDisconnectCb?: () => void;

  constructor(username: string) {
    this.username = username;
  }

  connect() {}
  disconnect() {
    this.onDisconnectCb?.();
  }

  send(_eventName: string, _data?: any) {}

  onMessage(cb: (eventName: string, data?: any) => void) {
    this.onMessageCb = cb;
  }

  onDisconnect(cb: () => void) {
    this.onDisconnectCb = cb;
  }

  /** BotController calls this to send a message to the server, as if it were a real client. */
  emit(eventName: string, data?: any) {
    this.onMessageCb?.(eventName, data);
  }
}
