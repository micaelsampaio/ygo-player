import { useCallback, useState } from "react";
import { Modal } from "../components/Modal"
import { Card, FieldZone } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";

export function GameSettingsDialog({ duel }: { duel: YGODuel, card: Card, originZone: FieldZone, player: number, clearAction: () => void; }) {
    const settings = duel.settings;
    const [gameMusicVolume, setGameMusicState] = useState(() => settings.getMusicVolume());
    const [gameSoundsVolume, setGameSoundsVolumeState] = useState(() => settings.getGameVolume());
    const [showFaceDownCardsTransparent, setShowFaceDownCardsTransparentState] = useState(() => settings.getShowFaceDownCardsTransparent());
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

    const setShowFaceDownCardsTransparent = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.target.blur();

        setShowFaceDownCardsTransparentState(v => {
            const value = !v;
            // need this because parent is preventing the default in clicks :) @RMS spaghetti
            setTimeout(() => {
                e.target.checked = value;
            });

            settings.setShowFaceDownCardsTransparent(value);
            return value;
        });
    }

    const setTimeScale = useCallback((dt: number) => {
        settings.setGameSpeed(dt);
        setGameSpeed(settings.getGameSpeed());
    }, [settings])

    const saveReplay = useCallback(async () => {
        if (!duel.config.actions?.saveReplay) return;

        try {
            const replayData = duel.ygo.getReplayData();
            await duel.config.actions.saveReplay(replayData);

        } catch (error) {

        }
    }, [duel]);

    const reportBug = useCallback(async () => {
        if (!duel.config.actions?.reportBug) return;
        try {
            const replayData = duel.ygo.getReplayData();
            const errors: string[] = [];

            await duel.config.actions.reportBug({ data: replayData, errors });

            closeSettings();
        } catch (error) { }
    }, [duel])

    const closeSettings = () => {
        duel.events.dispatch("close-ui-menu", { type: "settings-menu" });
    }

    return <Modal.Dialog close={closeSettings} visible size="md">
        <Modal.Header>
            <div>
                Game Settings
            </div>
        </Modal.Header>
        <Modal.Body>
            <div>

                {duel.config.actions?.saveReplay && <>
                    <div>
                        Replay
                    </div>

                    <div className="ygo-flex ygo-mt-2">
                        <button className="ygo-btn ygo-btn-action ygo-px-0 ygo-flex-grow-1" onClick={saveReplay}>Save Replay</button>
                    </div>
                </>}

                <div className="ygo-mt-4">Game Music Volume</div>
                <div className="ygo-mt-2">
                    <input type="range" id="volume" name="volume" step="0.1" min="0.0" max="1.0" value={gameMusicVolume} onChange={setGameMusicVolume} onInput={setGameMusicVolume} />
                </div>
                <div>Game Sounds Volume</div>
                <div>
                    <input type="range" id="volume" name="volume" step="0.1" min="0.0" max="1.0" value={gameSoundsVolume} onChange={setGameSoundsVolume} onInput={setGameSoundsVolume} />
                </div>

                <div className="ygo-mt-4">Card Transparents</div>
                <div className="ygo-flex ygo-mt-2">
                    <input
                        style={{ display: "inline-block", width: "auto" }}
                        type="checkbox"
                        checked={!!showFaceDownCardsTransparent}
                        onChange={setShowFaceDownCardsTransparent}
                    />
                    <div style={{ display: "inline-block", flexGrow: 1 }}>
                        Show Card Transparent when face down
                    </div>
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

                {duel.config.actions?.reportBug && <>
                    <div className="ygo-mt-4">
                        <div>
                            Report Bug 🐞
                        </div>

                        <div className="ygo-flex ygo-mt-2">
                            <button className="ygo-btn ygo-btn-action ygo-px-0 ygo-flex-grow-1" onClick={reportBug}>Report a Bug</button>
                        </div>
                    </div>
                </>}
            </div>
        </Modal.Body>
        <Modal.Footer>
            <button className="ygo-btn ygo-btn-action" onClick={closeSettings}>
                Close
            </button>
        </Modal.Footer>
    </Modal.Dialog >

}