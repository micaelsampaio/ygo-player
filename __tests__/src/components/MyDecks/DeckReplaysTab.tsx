import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { YGOGameUtils } from "ygo-core";
import { useNavigate } from "react-router-dom";
import { StoreService } from "../../services/store-service";

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
        const deck = await StoreService.getDeckFromDeckWithCardIds(player);
        return {
          ...player,
          ...deck
        }
      }));

      const replayData = {
        players,
        replay
      }

      console.log("NEW REPLAY ", replayData);

      localStorage.setItem("duel-data", JSON.stringify(replayData));

      navigate("/duel");
    } catch (error) {

    }
  }

  useEffect(() => {
    if (request.current) return;
    if (!deckId || !visible) return;

    const abortController = new AbortController();

    const loadData = async () => {
      try {
        const data = await StoreService.loadReplaysFromDeckId(deckId, abortController.signal);
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

    const { endField = [] } = replay;

    const initialFieldData = endField.reduce((acc: any, row: any) => {

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

    //const { endField: replay.endField } = replay;

    return {
      initialFieldData: initialFieldData,
      endField: endFieldData
    }

  }, [replay]);

  return <div>
    <div>
      {replay.id}
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
      <div>
        <a href="#" onClick={(e) => {
          e.preventDefault();
          openReplay(replay);
        }}>View Replay</a>
      </div>
    </div>
  </div>
}