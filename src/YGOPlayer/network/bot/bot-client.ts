import { YGOClient, YGOClientType } from "ygo-core";

/**
 * A bot has no separate "UI consumer" the way LocalYGOPlayerClient does (no
 * human ever calls .send()/.onMessage() on it from outside), so unlike the
 * human client/communication-twin pair it doesn't need the extra split —
 * this single class IS the server's view of the client directly.
 *
 * Directionality (matches YGOGameServer.bindClient()):
 *  - `send()` is called BY the server to push a broadcast — this is the
 *    bot's INBOUND path. Wired straight into BotController.
 *  - `onMessage(cb)` is called ONCE by the server to register its own
 *    handler for messages FROM this client. `emit()` is how the bot
 *    (via BotController) invokes that handler — its OUTBOUND path.
 */
export class BotYGOPlayerClient implements YGOClient {
  public type: YGOClientType = YGOClientType.PLAYER;
  public username: string;
  private onMessageCb?: (eventName: string, data?: any) => void;
  private onDisconnectCb?: () => void;
  private onServerSend?: (eventName: string, data?: any) => void;

  constructor(username: string) {
    this.username = username;
  }

  connect() {}
  disconnect() {
    this.onDisconnectCb?.();
  }

  /** Called by YGOGameServer to push a message to this client. */
  send(eventName: string, data?: any) {
    this.onServerSend?.(eventName, data);
  }

  onMessage(cb: (eventName: string, data?: any) => void) {
    this.onMessageCb = cb;
  }

  onDisconnect(cb: () => void) {
    this.onDisconnectCb = cb;
  }

  /** BotController wires itself up to receive every server broadcast. */
  onReceive(cb: (eventName: string, data?: any) => void) {
    this.onServerSend = cb;
  }

  /** BotController calls this to send a message to the server, as if it were a real client. */
  emit(eventName: string, data?: any) {
    this.onMessageCb?.(eventName, data);
  }
}
