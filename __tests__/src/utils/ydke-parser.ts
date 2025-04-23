import { DeckData } from "./ydk-parser";

export function ydkeToJson(ydkeUrl: string): DeckData {
  const base64Sections = ydkeUrl.replace("ydke://", "").split("!");
  const [mainDeckB64, extraDeckB64, sideDeckB64] = base64Sections;

  const decodeSection = (base64: string): number[] => {
    if (!base64) return [];
    const decoded = atob(base64);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }

    const cardIds: number[] = [];
    for (let i = 0; i < bytes.length; i += 4) {
      const id =
        bytes[i] |
        (bytes[i + 1] << 8) |
        (bytes[i + 2] << 16) |
        (bytes[i + 3] << 24);
      cardIds.push(id);
    }
    return cardIds;
  };

  return {
    mainDeck: decodeSection(mainDeckB64),
    extraDeck: decodeSection(extraDeckB64),
    sideDeck: decodeSection(sideDeckB64),
  };
}
