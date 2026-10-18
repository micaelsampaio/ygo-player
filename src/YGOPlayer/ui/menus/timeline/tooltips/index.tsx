import type { ComponentType } from "react";
import type { TimelineCommandProps } from "../types";
import { TooltipCommandWithCardName } from "./command-with-card-name";
import { DuelPhaseCommandTimeline } from "./duel-phase-command-timeline";
import { duelTurnCommandTimeline } from "./duel-turn-command-timeline";

const TOOLTIPS: Partial<Record<string, ComponentType<TimelineCommandProps>>> = {
    "Duel Phase": DuelPhaseCommandTimeline,
    "Duel Turn": duelTurnCommandTimeline,
}

export function TimelineCommandTooltip(props: TimelineCommandProps) {
    const Tooltip = TOOLTIPS[props.command.type] ?? TooltipCommandWithCardName;
    return <Tooltip {...props} />
}
