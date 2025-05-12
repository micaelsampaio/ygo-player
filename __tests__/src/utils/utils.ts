export function cloneObject<T = any>(obj: any): T {
  return JSON.parse(JSON.stringify(obj));
}

export const getCardSize = (
  parent: HTMLDivElement,
  cards: number
): { width: number; height: number } => {
  const parentWidth = parent.offsetWidth;
  const parentHeight = parent.offsetHeight;
  const aspectRatio = 1.45;

  let bestWidth = 0;
  let bestHeight = 0;

  for (let columns = 1; columns <= cards; columns++) {
    const rows = Math.ceil(cards / columns);
    const cardWidth = Math.floor(parentWidth / columns);
    const cardHeight = Math.floor(cardWidth * aspectRatio);

    const totalHeight = rows * cardHeight;

    if (totalHeight <= parentHeight) {
      if (cardWidth > bestWidth) {
        bestWidth = cardWidth;
        bestHeight = cardHeight;
      }
    }
  }

  return { width: bestWidth, height: bestHeight };
};