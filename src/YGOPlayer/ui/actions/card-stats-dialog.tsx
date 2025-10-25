import { useCallback, useEffect, useState } from "react";
import { Modal } from "../components/Modal"
import { Card, FieldZone, YGOCommands, YGOGameUtils } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { YGOSelect } from "../components/select";
import { YGOInput } from "../components/Input";

const levelOptions = [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
    { label: "5", value: "5" },
    { label: "6", value: "6" },
    { label: "7", value: "7" },
    { label: "8", value: "8" },
    { label: "9", value: "9" },
    { label: "10", value: "10" },
    { label: "11", value: "11" },
    { label: "12", value: "12" },
]

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
                duel.serverActions.ygo.exec({
                    command: new YGOCommands.ChangeCardAtkDefCommand({
                        player,
                        id: card.id,
                        originZone,
                        atk: typeof newAtk !== "undefined" ? newAtk : undefined,
                        def: typeof newDef !== "undefined" ? newDef : undefined,
                    })
                });
            }
        }

        if (typeof newLevel !== "undefined" && newLevel !== card.currentLevel) {
            duel.serverActions.ygo.exec({
                command: new YGOCommands.ChangeCardLevelCommand({
                    player,
                    id: card.id,
                    originZone,
                    level: newLevel
                })
            });
        }

    }, [card, atk, def, level]);

    useEffect(() => {
        setAtk((card.currentAtk || "0").toString());
        setDef((card.currentDef || "0").toString());
        setLevel((card.currentLevel || "1").toString());
    }, [card]);

    const isLink = YGOGameUtils.isLinkMonster(card);

    return <Modal.Dialog close={clearAction} visible size="md">
        <Modal.Header>
            <div>
                Change Card Stats
            </div>
        </Modal.Header>
        <Modal.Body>
            <div className="ygo-text-lg">
                {card.name}
            </div>
            <div className="ygo-flex ygo-gap-4 ygo-mt-3 ygo-card-stats-dialog-menu">
                <div>
                    <img className="ygo-card" src={card.images.small_url} />
                </div>
                <div>
                    <table className="ygo-data-table ygo-table-space-2">
                        <tr>
                            <td>ATK</td>
                            <td><YGOInput placeholder="Monster Atk" value={atk} onChange={e => setAtk(e.target.value)} /></td>
                        </tr>

                        {!isLink && <tr>
                            <td>DEF</td>
                            <td><YGOInput placeholder="Monster Def" value={def} onChange={e => setDef(e.target.value)} /></td>
                        </tr>}

                        {!isLink && <tr>
                            <td> LVL</td>
                            <td>
                                <YGOSelect
                                    value={level}
                                    onChange={newLevel => setLevel(newLevel)}
                                    options={levelOptions}
                                />
                            </td>
                        </tr>}
                    </table>
                </div>
            </div>
        </Modal.Body>
        <Modal.Footer>
            <button className="ygo-btn ygo-btn-action" onClick={clearAction}>
                Close
            </button>

            <button className="ygo-btn ygo-btn-action" onClick={applyChanges}>
                Apply changes
            </button>
        </Modal.Footer>
    </Modal.Dialog>

}