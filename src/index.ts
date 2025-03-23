/// CSS
import "./YGOPlayer/style/style.css";

/// TS
export * from "ygo-core";
export * from "./YGOPlayer/web";
export * from "./YGOPlayer/core/YGODuel";

import { YGOGameUtils } from "ygo-core";

export { YGOGameUtils };

export const sum = (a: number, b: number): number => a + b;

// console.log("YGO DUEL", sum, YGODuel2)

// export const YGODuel = YGODuel2;
