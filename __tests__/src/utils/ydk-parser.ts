export interface DeckData {
  mainDeck: number[];
  extraDeck: number[];
  sideDeck: number[];
}

export function ydkToJson(ydkContent: string): DeckData {
  const lines: string[] = ydkContent.split("\n");
  const mainDeckStart: number =
    lines.findIndex((line: string) => line.includes("#main")) + 1;
  const extraDeckStart: number =
    lines.findIndex((line: string) => line.includes("#extra")) + 1;
  const sideDeckStart: number =
    lines.findIndex((line: string) => line.includes("!side")) + 1;

  let cursor: number = mainDeckStart;
  const cardRegex: RegExp = /(\d+)/;

  const data: DeckData = {
    mainDeck: [],
    extraDeck: [],
    sideDeck: [],
  };

  // Parse main deck
  while (cursor < lines.length) {
    const line: string = lines[cursor].trim();
    const cardData: RegExpExecArray | null = cardRegex.exec(line);

    if (!cardData) break;
    data.mainDeck.push(Number(cardData[1]));
    ++cursor;
  }

  // Parse extra deck
  cursor = extraDeckStart;
  while (cursor < lines.length) {
    const line: string = lines[cursor].trim();
    const cardData: RegExpExecArray | null = cardRegex.exec(line);

    if (!cardData) break;
    data.extraDeck.push(Number(cardData[1]));
    ++cursor;
  }

  // Parse extra deck
  cursor = sideDeckStart;
  while (cursor < lines.length) {
    const line: string = lines[cursor].trim();
    const cardData: RegExpExecArray | null = cardRegex.exec(line);

    if (!cardData) break;
    data.sideDeck.push(Number(cardData[1]));
    ++cursor;
  }

  return data;
}
