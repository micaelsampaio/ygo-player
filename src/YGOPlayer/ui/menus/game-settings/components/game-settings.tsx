import { useCallback, useState } from "react";
import type { YGODuel } from "../../../../core/YGODuel";
import type { YGOPlayerSettings } from "../../../../core/YGOPlayerSettings";
import { Modal } from "../../../components/Modal";
import InputRange from "../../../components/range/InputRange";
import { CHAIN_MODE_SETTING, isEngineRoom } from "../../../../domain/chain-mode";
import { YGOClientType } from "ygo-core";
import { ChainStopsControl } from "../../chain-stops-control";
import { storedChainStops, storeChainStops, type ChainStops } from "../../duel-preferences";

/**
 * Chain stops, in every duel type (one setting, remembered across duels). An engine duel
 * (AI / Assisted) has the full control, synced with the server (duel.chainStops). A manual duel
 * has no rules engine to know what you could activate, so it only has two states: pass for you
 * (stored as Off) or stop at every action (Auto).
 */
function ChainStopsSetting({ duel }: { duel: YGODuel }) {
  const [manual, setManual] = useState<ChainStops>(() => storedChainStops());
  const live = duel.chainStops;
  if (live && isEngineRoom(duel.ygo?.options)) {
    return <div className="ygo-mt-4">
      <ChainStopsControl value={live.value} held={false} onChange={(next) => live.set(next)} />
    </div>;
  }
  const autoPass = manual === "off";
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next: ChainStops = e.target.checked ? "off" : "auto";
    if (live) live.set(next);
    storeChainStops(next);
    setManual(next);
    duel.events.dispatch("render-ui");
  };
  return <div className="ygo-flex ygo-mt-3">
    <input id="ygo-setting-auto-pass" style={{ display: "inline-block", width: "auto" }} type="checkbox" checked={autoPass} onChange={onChange} />
    <label htmlFor="ygo-setting-auto-pass" style={{ display: "inline-block", flexGrow: 1 }} title="Pass priority for you every time, like holding OK">
      Pass automatically when it's my priority
    </label>
  </div>;
}

/** The settings a checkbox toggles. */
type BooleanSetting = { [K in keyof YGOPlayerSettings]: YGOPlayerSettings[K] extends boolean ? K : never }[keyof YGOPlayerSettings];

export function GameSettingsDialog({ duel }: { duel: YGODuel }) {
  const settings = duel.settings;
  // Engine rooms (Assisted Mode / bot duels) number the chain themselves.
  const isReplay = duel.config?.gameMode === "REPLAY";
  const isPlaying = duel.client?.type === YGOClientType.PLAYER && !isReplay;
  // Manual duels (no rules engine): chain numbering, auto-pass and auto-placing are theirs.
  const isManual = isPlaying && !isEngineRoom(duel.ygo?.options);
  const [gameMusicVolume, setGameMusicState] = useState(() => settings.getMusicVolume());
  const [gameSoundsVolume, setGameSoundsVolumeState] = useState(() => settings.getGameVolume());
  const [gameSpeed, setGameSpeed] = useState(() => settings.getGameSpeed());

  const setGameMusicVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = Number(e.target.value);
    settings.setMusicVolume(volume);
    setGameMusicState(volume);
  }

  const setGameSoundsVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = Number(e.target.value);
    settings.setGameVolume(volume);
    setGameSoundsVolumeState(volume);
  }

  const onChangeCheckBox = (e: React.ChangeEvent<HTMLInputElement>, id: BooleanSetting) => {
    const value = e.target?.checked;
    settings.setConfigFromPath(id, value);

    // if (e.target) e.target.blur();

    setTimeout(() => {
      if (e.target) e.target.checked = value;
    });
  }

  const setTimeScale = useCallback((dt: number) => {
    settings.setGameSpeed(dt);
    setGameSpeed(settings.getGameSpeed());
  }, [settings])


  const closeSettings = () => {
    duel.events.dispatch("close-ui-menu", { type: "settings-menu" });
  }

  return <Modal.Dialog embedded close={closeSettings} visible size="md">
    <Modal.Header>
      <div>
        Game Settings
      </div>
    </Modal.Header>
    <Modal.Body>
      <div>

        <div>Game Music Volume</div>
        <div className="ygo-mt-2">
          <InputRange step={0.1} min={0} max={1} value={gameMusicVolume} onChange={setGameMusicVolume} onInput={setGameMusicVolume} />
        </div>
        <div>Game Sounds Volume</div>
        <div>
          <InputRange step={0.1} min={0} max={1} value={gameSoundsVolume} onChange={setGameSoundsVolume} onInput={setGameSoundsVolume} />
        </div>

        <div className="ygo-mt-4">
          <div>Game Speed</div>

          <div className="ygo-flex ygo-gap-1 ygo-mt-2">
            <button disabled={gameSpeed === 1} type="button" className="ygo-btn ygo-btn-action ygo-px-0 ygo-flex-grow-1" onClick={() => setTimeScale(1)}>
              1x
            </button>
            <button disabled={gameSpeed === 1.5} type="button" className="ygo-btn ygo-btn-action ygo-px-0 ygo-flex-grow-1" onClick={() => setTimeScale(1.5)}>
              1.5x
            </button>
            <button disabled={gameSpeed === 2} type="button" className="ygo-btn ygo-btn-action ygo-px-0 ygo-flex-grow-1" onClick={() => setTimeScale(2)}>
              2x
            </button>
            <button disabled={gameSpeed === 3} type="button" className="ygo-btn ygo-btn-action ygo-px-0 ygo-flex-grow-1" onClick={() => setTimeScale(3)}>
              3x
            </button>
          </div>
        </div>

        {isPlaying && isEngineRoom(duel.ygo?.options) && <ChainStopsSetting duel={duel} />}

        <div className="ygo-mt-6">
          <div>Game Settings</div>

          <div className="ygo-flex ygo-mt-4">
            <input
              style={{ display: "inline-block", width: "auto" }}
              type="checkbox"
              checked={!!settings.getConfigFromPath("showCardWhenPlayed")}
              onChange={e => onChangeCheckBox(e, "showCardWhenPlayed")}
            />
            <div style={{ display: "inline-block", flexGrow: 1 }}>
              Show Card details when card is played
            </div>
          </div>

          <div className="ygo-flex ygo-mt-3">
            <input
              style={{ display: "inline-block", width: "auto" }}
              type="checkbox"
              checked={settings.getConfigFromPath("showFaceDownCardsTransparent")}
              onChange={e => onChangeCheckBox(e, "showFaceDownCardsTransparent")}
            />
            <div style={{ display: "inline-block", flexGrow: 1 }}>
              Show Card Transparent when face down
            </div>
          </div>

          {isReplay && <div className="ygo-flex ygo-mt-3">
            <input
              style={{ display: "inline-block", width: "auto" }}
              type="checkbox"
              checked={settings.getConfigFromPath("autoStartReplay")}
              onChange={e => onChangeCheckBox(e, "autoStartReplay")}
            />
            <div style={{ display: "inline-block", flexGrow: 1 }}>
              Auto Start Replay when loaded
            </div>
          </div>}

          {isManual && <div className="ygo-flex ygo-mt-3">
            <input
              id="ygo-setting-auto-place"
              style={{ display: "inline-block", width: "auto" }}
              type="checkbox"
              checked={!!settings.getConfigFromPath("autoPlaceZone")}
              onChange={e => onChangeCheckBox(e, "autoPlaceZone")}
            />
            <label htmlFor="ygo-setting-auto-place" style={{ display: "inline-block", flexGrow: 1 }} title="Summon, set and move cards to the leftmost free zone without choosing one">
              Place cards in the first free zone automatically
            </label>
          </div>}

          {/* Solo: both sides are yours, so there's nobody to pass to. */}
          {isManual && !duel.ygo?.options?.controlOpponentCards && <ChainStopsSetting duel={duel} />}

          {isManual && <div className="ygo-flex ygo-mt-3">
            <input
              id="ygo-setting-chain-mode"
              style={{ display: "inline-block", width: "auto" }}
              type="checkbox"
              checked={settings.getConfigFromPath(CHAIN_MODE_SETTING) !== false}
              onChange={e => onChangeCheckBox(e, CHAIN_MODE_SETTING)}
            />
            <label htmlFor="ygo-setting-chain-mode" style={{ display: "inline-block", flexGrow: 1 }} title="Each Activate becomes the next chain link; resolve the chain link by link (it also resolves when the phase changes)">
              Chain mode: number activations as chain links
            </label>
          </div>}
        </div>

        {/* {duel.config.actions?.reportBug && <>
          <div className="ygo-mt-4">
            <div>
              Report Bug 🐞
            </div>

            <div className="ygo-flex ygo-mt-2">
              <button className="ygo-btn ygo-btn-action ygo-px-0 ygo-flex-grow-1" onClick={reportBug}>Report a Bug</button>
            </div>
          </div>
        </>} */}
      </div>
    </Modal.Body>
    <Modal.Footer>
      <button className="ygo-btn ygo-btn-action" onClick={closeSettings}>
        Close
      </button>
    </Modal.Footer>
  </Modal.Dialog >
}