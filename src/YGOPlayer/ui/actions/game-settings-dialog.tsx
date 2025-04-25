import { useState } from "react";
import { Modal } from "../components/Modal"
import { Card, FieldZone } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";

export function GameSettingsDialog({ duel }: { duel: YGODuel, card: Card, originZone: FieldZone, player: number, clearAction: () => void; }) {
    const settings = duel.settings;
    const [gameMusicVolume, setGameMusicState] = useState(() => settings.getMusicVolume());
    const [gameSoundsVolume, setGameSoundsVolumeState] = useState(() => settings.getGameVolume());
    const [showFaceDownCardsTransparent, setShowFaceDownCardsTransparentState] = useState(() => settings.getShowFaceDownCardsTransparent());

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

    const close = () => {
        duel.events.dispatch("close-ui-menu", { type: "settings-menu" });
    }

    return <Modal.Dialog close={close} visible size="md">
        <Modal.Header>
            <div>
                Game Settings
            </div>
        </Modal.Header>
        <Modal.Body>
            <div>
                <div>Game Music Volume</div>
                <div>
                    <input type="range" id="volume" name="volume" step="0.1" min="0.0" max="1.0" value={gameMusicVolume} onChange={setGameMusicVolume} onInput={setGameMusicVolume} />
                </div>
                <div>Game Sounds Volume</div>
                <div>
                    <input type="range" id="volume" name="volume" step="0.1" min="0.0" max="1.0" value={gameSoundsVolume} onChange={setGameSoundsVolume} onInput={setGameSoundsVolume} />
                </div>
                <div>Card Transparents</div>
                <div>
                    <input
                        style={{ flexShrink: "1" }}
                        type="checkbox"
                        checked={!!showFaceDownCardsTransparent}
                        onChange={setShowFaceDownCardsTransparent}
                    />
                    Show Card Transparent when face down
                </div>
            </div>
        </Modal.Body>
        <Modal.Footer>
            <button className="ygo-btn ygo-btn-action" onClick={close}>
                Close
            </button>
        </Modal.Footer>
    </Modal.Dialog >

}