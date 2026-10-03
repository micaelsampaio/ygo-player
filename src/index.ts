/// CSS
import "./YGOPlayer/style/style.css";

/// TS
export * from "ygo-core";
export * from "./YGOPlayer/web";
export * from "./YGOPlayer/core/YGODuel";
export * from "./YGOPlayer/core/field-themes";
export type { YGOPlayerErrorHandler, YGOPlayerErrorContext } from "./YGOPlayer/core/YGOPlayerLogger";

import { YGOGameUtils, YGOCore } from "ygo-core";

export { YGOGameUtils, YGOCore };
