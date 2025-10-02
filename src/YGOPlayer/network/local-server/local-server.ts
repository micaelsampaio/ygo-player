import { YGOProps } from "ygo-core";
import { YGOClient, YGOGameServer } from "ygo-core";

export class LocalYGOPlayerServer {
  public game!: YGOGameServer;

  constructor(player: YGOClient, props: YGOProps) {

    player.connect();

    this.game = new YGOGameServer({
      players: [player],
      ygoCoreProps: props,
    })
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