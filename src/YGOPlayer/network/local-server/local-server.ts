import { YGOProps } from "ygo-core";
import { YGOGameServer } from "ygo-core";
import { LocalYGOPlayerClient } from "./local-client";

export class LocalYGOPlayerServer {
  public game!: YGOGameServer;

  constructor(player: LocalYGOPlayerClient, props: YGOProps) {

    const serverClient = player.client;

    this.game = new YGOGameServer({
      players: [serverClient],
      ygoCoreProps: props,
    })
  }
}
