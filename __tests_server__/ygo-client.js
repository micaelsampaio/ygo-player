export class YGOSocketClient {

  constructor(socket, username, clientType) {
    this.socket = socket;
    this.username = username;
    this.type = clientType;

    this.socket.onAny((eventName, data) => {
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

  onMessage(cb) {
    this.onMessageCb = cb;
  }

  onDisconnect(cb) {
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

  send(eventName, data = {}) {
    console.log("Sending SERVER event:", eventName, data);
    this.socket.emit(eventName, data);
  }
}