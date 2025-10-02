import { YGOClient, YGOClientType } from "ygo-core";

// simulate local socket
export class LocalYGOPlayerClient implements YGOClient {
  public username: string = "";
  public client: YGOClient = null as any;
  public type: YGOClientType;
  private onMessageCb: any;
  private onDisconnectCb: any;

  constructor(username: string, type: YGOClientType) {
    this.username = username;
    this.type = type;
    this.client = new LocalYGOPlayerCommunication(this, this.username, this.type);
  }

  connect() {
  }

  disconnect() {

  }

  close() {
    // this.client.disconnect();
  }

  send(eventName: string, data?: any) {
    (this.client as any).onMessageCb(eventName, data);
  }

  onMessage(cb: (eventName: string, data?: any) => void): void {
    this.onMessageCb = cb;
  }

  onDisconnect(cb: () => void) {
    this.onDisconnectCb = cb;
  }
}

// simulate server socket
export class LocalYGOPlayerCommunication implements YGOClient {
  public type: YGOClientType;
  public username: string;
  public client: YGOClient;
  private onMessageCb: any;
  private onDisconnectCb: any;
  private connected: boolean;

  constructor(client: YGOClient, username: string, type: YGOClientType) {
    this.client = client;
    this.username = username;
    this.type = type;
    this.connected = true;
  }

  public send(eventName: string, data?: any) {
    if (!this.connected) return;
    (this.client as any).onMessageCb(eventName, data);
  }

  onMessage(cb: (eventName: string, data?: any) => void): void {
    this.onMessageCb = cb;
  }

  onDisconnect(cb: () => void) {
    this.onDisconnectCb = cb;
  }

  connect() {
    this.connected = true;
  }

  disconnect() {
    this.connected = false;
  }
}