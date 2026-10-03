import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YGOClientType } from "ygo-core";
import { LocalYGOPlayerClient, LocalYGOPlayerCommunication } from "./local-client";

/** The server side of the local pair: the `client` the server binds to. */
function serverSide(client: LocalYGOPlayerClient) {
  return client.client as LocalYGOPlayerCommunication;
}

describe("LocalYGOPlayerClient / LocalYGOPlayerCommunication", () => {
  beforeEach(() => { vi.spyOn(console, "log").mockImplementation(() => { }); });
  afterEach(() => vi.restoreAllMocks());

  it("creates its server-side communication with the same username and type", () => {
    const client = new LocalYGOPlayerClient("Yugi", YGOClientType.PLAYER);
    const server = serverSide(client);
    expect(server).toBeInstanceOf(LocalYGOPlayerCommunication);
    expect(server.username).toBe("Yugi");
    expect(server.type).toBe(YGOClientType.PLAYER);
    expect(server.client).toBe(client);
  });

  it("delivers a request to the server and the server's response back, synchronously", () => {
    const client = new LocalYGOPlayerClient("Yugi", YGOClientType.PLAYER);
    const server = serverSide(client);
    const received: [string, unknown][] = [];
    // A server that answers every request.
    server.onMessage((eventName, data) => server.send(`${eventName}:reply`, { echo: data }));
    client.onMessage((eventName, data) => received.push([eventName, data]));

    client.send("get-game-state", { id: 1 });
    expect(received).toEqual([["get-game-state:reply", { echo: { id: 1 } }]]);
  });

  it("ignores messages when nobody listens yet", () => {
    const client = new LocalYGOPlayerClient("Yugi", YGOClientType.PLAYER);
    expect(() => client.send("x")).not.toThrow();
    expect(() => serverSide(client).send("y")).not.toThrow();
  });

  it("the last onMessage listener replaces the previous one", () => {
    const client = new LocalYGOPlayerClient("Yugi", YGOClientType.PLAYER);
    const first = vi.fn();
    const second = vi.fn();
    client.onMessage(first);
    client.onMessage(second);
    serverSide(client).send("event", 1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("event", 1);
  });

  it("server-side disconnect notifies its listener and stops server messages until reconnect", () => {
    const client = new LocalYGOPlayerClient("Yugi", YGOClientType.PLAYER);
    const server = serverSide(client);
    const onClientMessage = vi.fn();
    const onDisconnect = vi.fn();
    client.onMessage(onClientMessage);
    server.onDisconnect(onDisconnect);

    server.disconnect();
    expect(onDisconnect).toHaveBeenCalledTimes(1);
    server.send("after-disconnect");
    expect(onClientMessage).not.toHaveBeenCalled();

    server.connect();
    server.send("after-connect");
    expect(onClientMessage).toHaveBeenCalledWith("after-connect", undefined);
  });

  it("client-side connect/disconnect/close are no-ops", () => {
    const client = new LocalYGOPlayerClient("Yugi", YGOClientType.PLAYER);
    const server = serverSide(client);
    const onServerMessage = vi.fn();
    server.onMessage(onServerMessage);
    client.disconnect();
    client.close();
    client.connect();
    client.send("still-works");
    expect(onServerMessage).toHaveBeenCalledWith("still-works", undefined);
  });
});
