import { useState } from "react"
import { ydkToJson } from "./scripts/ydk-parser";
import { downloadDeck } from "./scripts/download-deck";

export function DownloadDeck() {
    const [deckName, setDeckName] = useState("");
    const [deckAsText, setDeckAsText] = useState("");
    const [downloadState, setDownloadState] = useState({ status: "idle", message: "..." });

    const fetchDeck = async () => {
        try {
            const deckData = ydkToJson(deckAsText);
            const deck = await downloadDeck(deckData, {
                events: {
                    onProgess: (args) => {
                        setDownloadState({ status: "loading", message: `downloading cards: ${args.cardDownloaded}/${args.totalCards}` });
                    }
                }
            });
            window.localStorage.setItem(`deck_${deckName}`, JSON.stringify({
                name: deckName,
                ...deck
            }));
            setDownloadState({ status: "idle", message: `deck downloaded` });
        } catch (error: any) {
            setDownloadState({ status: "error", message: error.message || "ERROR" })
        }
    }

    return <>
        <h1># Download Deck</h1>
        <div>
            <input
                type="text"
                style={{ width: "100%", maxWidth: "600px", padding: "10px" }}
                placeholder="deck_name"
                value={deckName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeckName(e.target.value)} ></input>
            <br />
            <br />
        </div>
        <div>
            <textarea
                style={{ width: "100%", maxWidth: "600px", padding: "10px" }}
                rows={40}
                placeholder=""
                value={deckAsText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeckAsText(e.target.value)}
            ></textarea>
        </div>
        <div>

            <br />
            {downloadState.status} - {downloadState.message}
            <br />
        </div>
        <div>
            <button disabled={downloadState.status === "loading"} onClick={fetchDeck}>Download deck</button>
        </div>
    </>
}