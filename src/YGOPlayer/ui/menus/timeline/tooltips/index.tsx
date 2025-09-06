import { TimelineCommandProps } from "../../timeline";
import { TooltipCommandWithCardName } from "./command-with-card-name";
import { DuelPhaseCommandTimeline } from "./duel-phase-command-timeline";
import { duelTurnCommandTimeline } from "./duel-turn-command-timeline";

const TOOLTIPS: any = {
    DEFAULT: TooltipCommandWithCardName,
    "Duel Phase": DuelPhaseCommandTimeline,
    "Duel Turn": duelTurnCommandTimeline,
}

export function TimelineCommandTooltip(props: TimelineCommandProps) {
    const Tooltip = TOOLTIPS[props.command.type] || TOOLTIPS.DEFAULT;
    return <Tooltip {...props} />
}