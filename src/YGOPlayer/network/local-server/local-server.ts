import { YGOProps } from "ygo-core";
import { YGOClient, YGOGameServer } from "ygo-core";

export class LocalYGOPlayerServer {
  public game!: YGOGameServer;

  constructor(player: YGOClient, props: YGOProps) {

    const serverClient = (player as any).client;

    this.game = new YGOGameServer({
      players: [serverClient],
      ygoCoreProps: props,
    })
  }
}
