import { YGOProps } from "ygo-core";
import { YGOClient, YGOGameServer } from "ygo-core";
import { BotController } from "../bot/bot-controller";

export class LocalYGOPlayerServer {
  public game!: YGOGameServer;

  constructor(player: YGOClient, props: YGOProps, bot?: BotController) {

    const serverClient = (player as any).client;

    // Unlike the human's client (which needs the .client unwrap above — see
    // local-client.ts's send/communication-twin split), a bot's client IS
    // already the server-facing view directly, so it's passed through as-is.
    const players = bot ? [serverClient, bot.getClient()] : [serverClient];

    this.game = new YGOGameServer({
      players,
      ygoCoreProps: props,
    })

    // Must happen after YGOGameServer's constructor has bound the bot's
    // client (registers its onMessage handler) — any earlier and this is a
    // silent no-op with nothing listening yet. attachGame gives the bot its
    // read-only view of the shared core and must run before sendReady().
    bot?.attachGame(this.game.ygo);
    bot?.sendReady();
  }
}

// class LocalYGOClient implements YGOClient {
//   public type: YGOClientType;
//   public username: string;

//   private onMessageCb: ((event: string, data: any) => void) | undefined;
//   private onDisconnectCb: (() => void) | undefined;

// }
// class LocalClient implements YGOClient {
//   public type: YGOClientType;
//   public username: string;
//   private connected: boolean;
//   private onMessageCb: ((event: string, data: any) => void) | undefined;
//   private onDisconnectCb: (() => void) | undefined;

//   constructor(username: string, type: YGOClientType) {
//     this.username = username;
//     this.type = type;
//     this.connected = true;
//   }

//   public disconnect() {
//     this.connected = false;
//     this.onDisconnectCb?.();
//   }

//   public send(eventName: string, data?: any) {
//     if (!this.connected) return;

//     // TODO
//   }

//   onMessage(cb: (eventName: string, data?: any) => void): void {
//     this.onMessageCb = cb;
//   }

//   onDisconnect(cb: () => void) {
//     this.onDisconnectCb = cb;
//   }
// }