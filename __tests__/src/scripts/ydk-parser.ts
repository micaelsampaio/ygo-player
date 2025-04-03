//TODO @mica maybe move this to a utils file

export interface DeckData {
  mainDeck: number[];
  extraDeck: number[];
}

export function ydkToJson(ydkContent: string): DeckData {
  const lines: string[] = ydkContent.split("\n");
  const mainDeckStart: number =
    lines.findIndex((line: string) => line.includes("#main")) + 1;
  const extraDeckStart: number =
    lines.findIndex((line: string) => line.includes("#extra")) + 1;

  let cursor: number = mainDeckStart;
  const cardRegex: RegExp = /(\d+)/;

  const data: DeckData = {
    mainDeck: [],
    extraDeck: [],
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

  return data;
}
