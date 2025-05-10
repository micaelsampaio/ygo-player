import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { YGOCore, YGOGameUtils } from "ygo-core";
import { useNavigate } from "react-router-dom";
import { StoreService } from "../../services/store-service";
import { APIService } from "../../services/api-service";
import { Button } from "../UI";
import { YgoReplayToImage } from "ygo-core-images-utils";
import { MoreVertical } from "lucide-react";

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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {replays.map((replay: any) => <ReplayEntry key={replay.id} data={replay} openReplay={openReplay} />)}
    </div>
  </div>
}

function ReplayEntry({ data: replay, openReplay }: { data: any, openReplay: (replay: any) => void }) {

  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-semibold">
          {replay.name || replay.id}
        </div>
        <div className="text-gray-500">
          <ThreeDotsMenu>
            <a
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer truncate"
              href={`/create-combo/replay/${replay.id || replay.replayId}`}
              target="_blank"
            >
              Create Combo
            </a>
            <div className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer truncate">
              Delete Replay
            </div>
          </ThreeDotsMenu>
        </div>

      </div>

      <div className="w-full aspect-square bg-gray-100 rounded-md mb-4">
        <ReplayField data={replay} />
      </div>

      <div className="mt-auto flex justify-end space-x-2">

        {
          Array.isArray(replay.combos) && replay.combos.map((combo: any) => <Combo data={combo} replay={replay} key={combo.id} />)
        }

        <Button onClick={() => openReplay(replay)}>
          View Replay
        </Button>
      </div>
    </div>
  );
}


interface ThreeDotsMenuProps {
  children: React.ReactNode;
}


const ThreeDotsMenu: React.FC<ThreeDotsMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);  // Reference to the menu
  const buttonRef = useRef<HTMLDivElement | null>(null); // Reference to the button

  const toggleMenu = () => {
    setIsOpen(prevState => !prevState);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  // Click outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={buttonRef}>
      <div
        onClick={toggleMenu}
        className="text-gray-500 cursor-pointer hover:text-gray-700"
      >
        <MoreVertical />
      </div>
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-md z-10 min-w-[150px]"
        >
          {children}
        </div>
      )}
    </div>
  );
};


function ReplayField({ data }: { data: any }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handContainerRef = useRef<HTMLDivElement | null>(null);

  const board: any = useMemo(() => {
    const board = {
      fieldSpell: null as any,
      monsterZones: [null, null, null, null, null] as any,
      spellZones: [null, null, null, null, null] as any,
      extraMonsterZones: [null, null] as any,
      hand: [] as any[]
    };

    data.initialField.forEach((row: any) => {
      const zoneData = YGOGameUtils.getZoneData(row.zone);
      if (zoneData.player === 0 && zoneData.zone === "H") {
        board.hand.push(row);
      }
    }, []);

    data.endField.forEach((row: any) => {
      const zoneData = YGOGameUtils.getZoneData(row.zone);
      if (zoneData.player === 0 && (zoneData.zone === "F" || zoneData.zone === "M" || zoneData.zone === "S" || zoneData.zone === "EMZ")) {
        if (zoneData.zone === "F") board.fieldSpell = row;
        if (zoneData.zone === "M") board.monsterZones[zoneData.zoneIndex - 1] = row;
        if (zoneData.zone === "S") board.spellZones[zoneData.zoneIndex - 1] = row;
        if (zoneData.zone === "EMZ") board.extraMonsterZones[zoneData.zoneIndex - 1] = row;
      }
    }, []);

    return board;
  }, [data]);

  const renderZone = (key: string, cardData: any | null) => (
    <div key={key} className="col-span-1 aspect-square flex flex-col items-center justify-center text-xs relative">
      <div className="h-full w-[80%] border-2 border-blue-300/50 border-dotted" />

      {cardData && (
        <img
          src={`${cdnUrl}/images/cards_small/${cardData.id}.jpg`}
          alt=""
          className={`h-[90%] absolute top-[5%] aspect-[0.714] object-contain transition-transform 
          ${YGOGameUtils.isDefense(cardData) ? '-rotate-90' : ''}
          rounded-[2px]`}
        />
      )}

    </div>
  );

  useEffect(() => {
    const resize = () => {
      const container = containerRef.current!;
      const handContainer = handContainerRef.current!;
      const height = container.offsetHeight * 0.25;
      const space = container.offsetHeight * 0.05;

      handContainer.style.height = height + "px";
      handContainer.style.paddingTop = space + "px";

      const cards = handContainer.querySelectorAll('img');
      const cardWidth = height * 0.714;
      const totalCards = cards.length;

      const needsOverlap = totalCards > 5;

      if (needsOverlap) {
        const containerWidth = handContainer.offsetWidth;
        const maxOffset = containerWidth - cardWidth;
        const offsetStep = totalCards > 1 ? maxOffset / (totalCards - 1) : 0;

        cards.forEach((card, index) => {
          card.style.position = 'absolute';
          card.style.top = `${height * 0.1}px`;
          card.style.left = `${offsetStep * index}px`;
          card.style.zIndex = (index + 1).toString();
          card.style.width = cardWidth + "px";
          card.style.height = height + "px";
        });
      } else {
        cards.forEach(card => {
          card.style.position = '';
          card.style.left = '';
          card.style.zIndex = '';
          card.style.width = cardWidth + "px";
          card.style.height = height + "px";
        });
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(containerRef.current!);

    resize();
    return () => {
      resizeObserver.disconnect();
    };
  }, [board.hand.length]);

  return (
    <div className="w-full h-full bg-gray-800 p-4 flex flex-col justify-center items-center rounded" ref={containerRef}>
      <div className="grid grid-cols-6 gap-2 w-full">
        <div className="col-span-1" />
        <div className="col-span-1" />
        {renderZone("emz-1", board.extraMonsterZones[0])}
        <div className="col-span-1" />
        {renderZone("emz-2", board.extraMonsterZones[1])}
        <div className="col-span-1" />
        {renderZone("f", board.fieldSpell)}
        {board.monsterZones.map((cardData: any, index: number) => renderZone("m" + index, cardData))}
        <div className="col-span-1" />
        {board.spellZones.map((cardData: any, index: number) => renderZone("s" + index, cardData))}
      </div>
      <div
        ref={handContainerRef}
        className="col-span-6 flex items-center justify-center gap-1 relative w-full"
      >
        {board.hand.map((cardData: any, index: number) => {
          return <img
            key={cardData.id}
            src={`${cdnUrl}/images/cards_small/${cardData.id}.jpg`}
            alt=""
          />
        })}
      </div>
    </div>
  );
}

export default ReplayField;


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
    <Button onClick={createImage} >
      View Combo
    </Button>
  </>
}