import { useEffect, useRef, useState } from "react";
import { YgoReplayToImage } from "ygo-core-images-utils";
import { StoreService } from "../../services/store-service";
import { APIService } from "../../services/api-service";
import { YGOCore } from "ygo-core";

export function useReplayUtils(replayId: string): { replayUtils: YgoReplayToImage, isLoading: boolean } {
  const [isLoading, setIsLoading] = useState(true);
  const replayUtils = useRef<YgoReplayToImage>(null);

  useEffect(() => {

    setIsLoading(true);

    const init = (replayData: any) => {

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

      replayUtils.current = new YgoReplayToImage({
        cdnUrl: String(import.meta.env.VITE_YGO_CDN_URL),
        translations: {}
      });

      replayUtils.current.setYGO(ygo);
    }

    const loadData = async () => {
      try {
        const replay = await StoreService.getReplayFromId(replayId);
        const decks = await Promise.all([APIService.getDeckFromDeckWithCardIds(replay.players[0]), APIService.getDeckFromDeckWithCardIds(replay.players[1])])
        const replayData = {
          players: decks,
          replay
        }

        init(replayData);
        setIsLoading(false);
      } catch (error) {
        console.log("TCL: ERROR: ", error);
      }
    }

    loadData();

  }, [replayId])

  return {
    isLoading,
    replayUtils: replayUtils.current!,
  };
}
