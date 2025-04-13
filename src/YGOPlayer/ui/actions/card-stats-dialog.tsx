import { useCallback, useEffect, useState } from "react";
import { Modal } from "../components/Modal"
import { Card, FieldZone, YGOCommands } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";

export function CardStatsDialog({ duel, card, player, originZone, clearAction }: { duel: YGODuel, card: Card, originZone: FieldZone, player: number, clearAction: () => void; }) {

    const [atk, setAtk] = useState("");
    const [def, setDef] = useState("");
    const [level, setLevel] = useState("");

    const applyChanges = useCallback(() => {
        const newAtk = isNaN(Number(atk)) ? undefined : Number(atk);
        const newDef = isNaN(Number(def)) ? undefined : Number(def);
        const newLevel = isNaN(Number(level)) ? undefined : Number(level);

        if (typeof newAtk !== "undefined" || typeof newDef !== "undefined") {
            if (newAtk !== card.currentAtk || newDef !== card.currentDef) {
                duel.execCommand(new YGOCommands.ChangeCardAtkDefCommand({
                    player,
                    id: card.id,
                    originZone,
                    atk: typeof newAtk !== "undefined" ? newAtk : undefined,
                    def: typeof newDef !== "undefined" ? newDef : undefined,
                }));
            }
        }

        if (typeof newLevel !== "undefined" && newLevel !== card.currentLevel) {
            duel.execCommand(new YGOCommands.ChangeCardLevelCommand({
                player,
                id: card.id,
                originZone,
                level: newLevel
            }));
        }

    }, [card, atk, def, level]);

    useEffect(() => {
        setAtk(card.currentAtk.toString());
        setDef(card.currentDef.toString());
        setLevel(card.currentLevel.toString());
    }, [card]);

    return <Modal.Dialog close={clearAction} visible size="md">
        <Modal.Header>
            <div>
                Change Card Stats
            </div>
        </Modal.Header>
        <Modal.Body>
            <div className="ygo-flex">
                <div>ATK</div>
                <div>
                    <input placeholder="Monster Atk" value={atk} onChange={e => setAtk(e.target.value)} />
                </div>
            </div>
            <div className="ygo-flex">
                <div>DEF</div>
                <div>
                    <input placeholder="Monster Def" value={def} onChange={e => setDef(e.target.value)} />
                </div>
            </div>
            <div className="ygo-flex">
                <div>Level</div>
                <div>
                    <select value={level} onChange={e => setLevel(e.target.value)}>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                        <option value="9">9</option>
                        <option value="10">10</option>
                        <option value="11">11</option>
                        <option value="12">12</option>
                    </select>
                </div>
            </div>
        </Modal.Body>
        <Modal.Footer>
            <button className="ygo-btn ygo-btn-primary" onClick={clearAction}>
                Close
            </button>

            <button className="ygo-btn ygo-btn-primary" onClick={applyChanges}>
                Apply changes
            </button>
        </Modal.Footer>
    </Modal.Dialog>

}