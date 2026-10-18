// Moved to domain/ so core/ can use it without importing ui/. Kept as a
// re-export so existing ui imports keep working.
export * from "../domain/assist-prompt";

import type { EnginePlace } from "../domain/assist-zones";
import type { PromptAnswer } from "../domain/assist-prompt";

/** What a held prompt is answered with (the engine's "Respond Prompt" data). */
export type PromptResponse =
  | PromptAnswer
  | { places: EnginePlace[] }
  | { index: number }
  | { position: number }
  | { yes: number }
  | { option: number };
