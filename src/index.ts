/// CSS
import "./YGOPlayer/style/style.css";
import "./YGOPlayer/style/card-preview.css";
import "./YGOPlayer/style/long-press-indicator.css";

/// TS
export * from "ygo-core";
export * from "./YGOPlayer/web";
export * from "./YGOPlayer/core/YGODuel";

import { YGOGameUtils, YGOCore } from "ygo-core";

export { YGOGameUtils, YGOCore };

export const sum = (a: number, b: number): number => a + b;

// console.log("YGO DUEL", sum, YGODuel2)

// export const YGODuel = YGODuel2;
