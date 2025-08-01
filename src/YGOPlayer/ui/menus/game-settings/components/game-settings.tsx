import { useCallback, useState } from "react";
import { YGODuel } from "../../../../core/YGODuel";
import { YGOPlayerSettings } from "../../../../core/YGOPlayerSettings";
import { Modal } from "../../../components/Modal";
import InputRange from "../../../components/range/InputRange";

export function GameSettingsDialog({ duel }: { duel: YGODuel }) {
  const settings = duel.settings;
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

  const onChangeCheckBox = (e: React.ChangeEvent<HTMLInputElement>, id: keyof YGOPlayerSettings) => {
    const value = e.target?.checked;
    console.log("CHECK :", value);
    settings.setConfigFromPath(id, value as any);

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

          <div className="ygo-flex ygo-mt-3">
            <input
              style={{ display: "inline-block", width: "auto" }}
              type="checkbox"
              checked={settings.getConfigFromPath("autoStartReplay")}
              onChange={e => onChangeCheckBox(e, "autoStartReplay")}
            />
            <div style={{ display: "inline-block", flexGrow: 1 }}>
              Auto Start Replay when loaded
            </div>
          </div>
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