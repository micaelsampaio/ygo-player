import { TimelineCommandProps } from "../../timeline";
import { TooltipCommandWithCardName } from "./command-with-card-name";

const TOOLTIPS: any = {
    DEFAULT: TooltipCommandWithCardName
}

export function TimelineCommandTooltip(props: TimelineCommandProps) {
    const Tooltip = TOOLTIPS[props.command.type] || TOOLTIPS.DEFAULT;
    return <Tooltip {...props} />
}