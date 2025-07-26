import { useCallback, useState } from "react";
import { Modal } from "../components/Modal"
import { Card, FieldZone } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { YGOTextArea } from "../components/TextArea";
import { YGOInput } from "../components/Input";

export function DuelNotesFormAction({ duel, clearAction }: { duel: YGODuel, card: Card, originZone: FieldZone, player: number, clearAction: () => void; }) {

    const [note, setNote] = useState("");
    const [duration, setDuration] = useState("");

    const applyChanges = useCallback(() => {
        const parsedDuration = duration && !isNaN(Number(duration)) ? Number(duration) : -1;
        duel.gameActions.addDuelNote({ note, duration: parsedDuration });
        clearAction();
    }, [note, duration]);

    const validNote = note.length > 0 && note.length <= 150;

    return <Modal.Dialog close={clearAction} visible size="md">
        <Modal.Header>
            <div>
                Duel Notes
            </div>
        </Modal.Header>
        <Modal.Body>
            <div>
                <YGOTextArea placeholder="Add your notes"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    maxLength={150}
                    style={{ height: "150px", fontSize: "16px", lineHeight: "20px" }} />
            </div>

            <div className="ygo-text-sm ygo-mt-1 ygo-text-right ygo-text-muted">
                {note.length}/150
            </div>

            <div className="ygo-mt-4">
                <YGOInput
                    placeholder="Time to display message in seconds ex: 30"
                    value={duration}
                    onChange={e => setDuration(e.target.value)} />
            </div>
        </Modal.Body>
        <Modal.Footer>
            <button className="ygo-btn ygo-btn-action" onClick={clearAction}>
                Close
            </button>

            <button className="ygo-btn ygo-btn-action" disabled={!validNote} onClick={validNote ? applyChanges : undefined}>
                Save
            </button>
        </Modal.Footer>
    </Modal.Dialog>

}