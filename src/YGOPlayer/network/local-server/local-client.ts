import { YGOClient, YGOClientType } from "ygo-core";

type MessageCallback = (eventName: string, data?: unknown) => void;

/** One end of the local pair: what the other end calls to deliver a message. */
interface LocalPeer {
  onReceiveMessage(eventName: string, data?: unknown): void;
}

// simulate local socket
export class LocalYGOPlayerClient implements YGOClient {
  public username: string = "";
  public client: LocalYGOPlayerCommunication;
  public type: YGOClientType;
  private onMessageCb: MessageCallback | undefined;
  private onDisconnectCb: (() => void) | undefined;

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

  send(eventName: string, data?: unknown) {
    this.client.onReceiveMessage(eventName, data);
  }

  onReceiveMessage(eventName: string, data?: unknown) {
    this.onMessageCb?.(eventName, data);
  }

  onMessage(cb: MessageCallback): void {
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
  public client: YGOClient & LocalPeer;
  private onMessageCb: MessageCallback | undefined;
  private onDisconnectCb: (() => void) | undefined;
  private connected: boolean;

  constructor(client: YGOClient & LocalPeer, username: string, type: YGOClientType) {
    this.client = client;
    this.username = username;
    this.type = type;
    this.connected = true;
  }

  public send(eventName: string, data?: unknown) {
    if (!this.connected) return;
    this.client.onReceiveMessage(eventName, data);
  }

  onReceiveMessage(eventName: string, data?: unknown) {
    this.onMessageCb?.(eventName, data);
  }

  onMessage(cb: MessageCallback): void {
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
    this.onDisconnectCb?.();
  }
}