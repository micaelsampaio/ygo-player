import type { YGOClient, YGOClientType } from "ygo-core";
import type { Socket } from "socket.io-client";

export class YGOSocketClient implements YGOClient {

  public username: string;
  public type: YGOClientType;
  public connected: boolean = false;

  private onMessageCb: (eventName: string, data?: any) => void = () => { };
  private onDisconnectCb: () => void = () => { }

  constructor(private socket: Socket, username: string, clientType: YGOClientType) {
    this.username = username;
    this.type = clientType;

    this.socket.onAny((eventName: string, data: any) => {
      if (eventName === "connect" || eventName === "disconnect") return;
      console.log("Received event:", eventName, data);
      this.onMessageCb?.(eventName, data);
    });

    this.socket.on("connect", () => {
      this.connected = true;
    })

    this.socket.on("disconnect", () => {
      const wasConnected = this.connected;
      if (!wasConnected) return;
      this.connected = false;
      this.onDisconnectCb?.();
    })
  }

  onMessage(cb: (eventName: string, data?: any) => void): void {
    this.onMessageCb = cb;
  }

  onDisconnect(cb: () => void) {
    this.onDisconnectCb = cb;
  };

  connect() {
    this.connected = true;
  };

  disconnect() {
    if (!this.connected) return;
    this.connected = false;
    this.socket.offAny(); // remove onAny listener
    this.socket.off("connect");
    this.socket.off("disconnect");
    this.socket.disconnect();
    this.onDisconnectCb?.();
  }

  send(eventName: string, data?: any) {
    this.socket.emit(eventName, data);
  }
}