import { useState } from "react";
import { ydkToJson } from "./utils/ydk-parser";
import { downloadDeck } from "./utils/download-deck";

export function DownloadDeck() {
  const [deckName, setDeckName] = useState("");
  const [deckAsText, setDeckAsText] = useState("");
  const [downloadState, setDownloadState] = useState({
    status: "idle",
    message: "...",
  });

  const fetchDeck = async () => {
    try {
      if (!deckName) return alert("NO DECK NAME");

      if (!deckAsText) return alert("NO DECK DATA");

      const deckData = ydkToJson(deckAsText);
      const deck = await downloadDeck(deckData, {
        events: {
          onProgess: (args) => {
            setDownloadState({
              status: "loading",
              message: `downloading cards: ${args.cardDownloaded}/${args.totalCards}`,
            });
          },
        },
      });
      const deckDataToStore = {
        id: String(Date.now()),
        ...deck,
        name: deckName,
      };
      window.localStorage.setItem(
        `deck_${deckName}`,
        JSON.stringify(deckDataToStore)
      );
      setDownloadState({ status: "idle", message: `deck downloaded` });
    } catch (error: any) {
      setDownloadState({ status: "error", message: error.message || "ERROR" });
    }
  };

  const readYDKFromFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = function (e: any) {
      setDeckAsText(e.target.result);
    };

    // Read the file as text
    reader.readAsText(file);
  };

  return (
    <>
      <h1># Download Deck</h1>
      <div>
        <input
          type="text"
          style={{ width: "100%", maxWidth: "600px", padding: "10px" }}
          placeholder="deck_name"
          value={deckName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setDeckName(e.target.value)
          }
        ></input>
        <br />
        <br />
      </div>
      <div>
        <textarea
          style={{ width: "100%", maxWidth: "600px", padding: "10px" }}
          rows={40}
          placeholder="Paste here the YDK File"
          value={deckAsText}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setDeckAsText(e.target.value)
          }
        ></textarea>
        <input
          type="file"
          onChange={(e: any) => {
            readYDKFromFile(e.target.files[0]);
          }}
        ></input>
      </div>
      <div>
        <br />
        {downloadState.status} - {downloadState.message}
        <br />
      </div>
      <div>
        <button
          disabled={downloadState.status === "loading"}
          onClick={fetchDeck}
        >
          Download deck
        </button>
      </div>
    </>
  );
}
