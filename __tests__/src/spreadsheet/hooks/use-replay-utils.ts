import { useState } from "react";
import { YGOCore } from "ygo-player";
import { YgoReplayToImage } from "ygo-core-images-utils";

export function useReplayUtils(): YgoReplayToImage {
  const [replayUtils] = useState(() => {
    const replayData = JSON.parse(localStorage.getItem("duel-data")!);

    const props = {
      players: replayData.players as any,
      commands: replayData.replay.commands,
      options: {
        fieldState: replayData.replay.initialField ? replayData.replay.initialField : undefined,
        execCommands: true,
        shuffleDecks: false,
      },
    };

    const ygo = new YGOCore(props);

    ygo.start();

    const replayUtils = new YgoReplayToImage({ translations: {} });

    replayUtils.setYGO(ygo);

    return replayUtils;
  });

  return replayUtils;
}
