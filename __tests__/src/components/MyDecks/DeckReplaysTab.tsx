import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { YGOCore, YGOGameUtils } from "ygo-core";
import { useNavigate } from "react-router-dom";
import { StoreService } from "../../services/store-service";
import { APIService } from "../../services/api-service";
import { Button } from "../UI";
import { YgoReplayToImage } from "ygo-core-images-utils";

interface ReplayDataDto {

}

const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL);

export function DeckReplaysTab({ deckId, visible = true }: { deckId: string, visible?: boolean }) {

  const [replays, setReplays] = useState<ReplayDataDto[]>([]);
  const request = useRef(false);

  const navigate = useNavigate();

  const openReplay = async (replay: any) => {
    try {
      const players = await Promise.all(replay.players.map(async (player: any) => {
        const deck = await APIService.getDeckFromDeckWithCardIds(player);
        return {
          ...player,
          ...deck
        }
      }));

      const replayData = {
        players,
        replay
      }

      console.log("DATA: ", replayData)
      localStorage.setItem("duel-data", JSON.stringify(replayData));

      navigate("/duel");
    } catch (error) {
      console.log("ERROR ", error);
    }
  }

  useEffect(() => {
    if (request.current) return;
    if (!deckId || !visible) return;

    const abortController = new AbortController();

    const loadData = async () => {
      try {
        const data = await StoreService.getReplaysFromDeckId(deckId, abortController.signal);
        request.current = true;
        setReplays(data);
      } catch (error: any) {
        if (axios.isCancel(error) || error.name === 'CanceledError') return;
      }
    }

    loadData();

    return () => {
      abortController.abort();
    }

  }, [visible, deckId])

  return <div>
    {replays.map((replay: any) => <ReplayEntry key={replay.id} data={replay} openReplay={openReplay} />)}
  </div>
}

function ReplayEntry({ data: replay, openReplay }: { data: any, openReplay: (replay: any) => void }) {

  const data = useMemo(() => {

    const { initialField = [], endField = [] } = replay;

    const initialFieldData = initialField.reduce((acc: any, row: any) => {

      const zoneData = YGOGameUtils.getZoneData(row.zone);
      let id = 0;

      if (zoneData.player === 0 && zoneData.zone === "H") {
        const newData = {
          key: `initial_Field_${++id}`,
          ...row
        }
        acc.push(newData);
      }
      return acc;
    }, [])

    const endFieldData = endField.reduce((acc: any, row: any) => {

      const zoneData = YGOGameUtils.getZoneData(row.zone);
      let id = 0;

      if (zoneData.player === 0 && (zoneData.zone === "M" || zoneData.zone === "S" || zoneData.zone === "EMZ")) {
        const newData = {
          key: `end_Field_${++id}`,
          ...row
        }
        acc.push(newData);
      }
      return acc;
    }, [])

    return {
      initialFieldData: initialFieldData,
      endField: endFieldData
    }

  }, [replay]);

  return <div>
    <div>
      {replay.id || replay.replayId}
    </div>
    <div>
      <div>Start Hand</div>
      <div>
        {data.initialFieldData.map((card: any) => <img key={card.key} src={`${cdnUrl}/images/cards_small/${card.id}.jpg`} style={{ height: "100px" }} />)}
      </div>
      <div>End board</div>
      <div>
        {data.endField.map((card: any) => <img key={card.key} src={`${cdnUrl}/images/cards_small/${card.id}.jpg`} style={{ height: "100px" }} />)}
      </div>
      <div className="flex gap-2 mt-4">

        <Button onClick={() => openReplay(replay)}>
          View Replay
        </Button>

        <Button as="a" href={`/create-combo/replay/${replay.id || replay.replayId}`} target="_blank">Create Combo</Button>

        {
          Array.isArray(replay.combos) && replay.combos.map((combo: any) => <Combo data={combo} replay={replay} key={combo.id} />)
        }
      </div>
    </div>
  </div>
}

function Combo({ replay, data }: { data: any, replay: any }) {

  const createImage = async () => {
    try {
      console.log(data);

      const players = await Promise.all(replay.players.map(async (player: any) => {
        const deck = await APIService.getDeckFromDeckWithCardIds(player);
        return {
          ...player,
          ...deck
        }
      }));

      const props = {
        players,
        options: {
          shuffleDecks: false,
        },
      }

      const YGO = new YGOCore(props);
      YGO.start();

      const utils = new YgoReplayToImage({ cdnUrl, translations: {} });
      utils.setYGO(YGO);

      const blob = await utils.createImage({ logs: data.logs, download: false });

      if (!blob) return;

      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.log(error)
    }
  }

  return <>
    <Button onClick={createImage} variant="success">
      View Combo Image
    </Button>
  </>
}