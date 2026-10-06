import { useEffect, useState } from "react";
import type { YGODuel } from "../../core/YGODuel";
import { offeredPileCodes } from "./extra-deck-highlight";

/** The codes the engine offers from a pile right now (`loc`), kept up to date for an opened pile viewer. */
export function useOfferedPileCodes(duel: YGODuel, loc: number): Set<number> {
  const [codes, setCodes] = useState<Set<number>>(() => offeredPileCodes(duel.assistController.options as any, loc));
  useEffect(() => duel.assistController.subscribe((res) => setCodes(offeredPileCodes(res as any, loc))), [duel, loc]);
  return codes;
}
