import { memo } from "react";
import { TimelineCommandProps } from "../../timeline";
import { TimelineCommandTooltip } from "../tooltips";

export const DefaultTimelineCommand = memo(function (props: TimelineCommandProps) {
    const { command, commandClass, onCommandClick } = props;
    const icon = icons[command.type];
    return <button
        className={`command ${commandClass}`}
        onClick={() => onCommandClick(command)}
    >
        {icon && <div className={icon}></div>}
        <TimelineCommandTooltip {...props} />
    </button>
});

const icons: any = {
    "Link Summon": "command-timeline-icon command-timeline-icon-link-summon",
    "XYZ Summon": "command-timeline-icon command-timeline-icon-xyz-summon",
    "Fusion Summon": "command-timeline-icon command-timeline-icon-fusion-summon",
    "Synchro Summon": "command-timeline-icon command-timeline-icon-synchro-summon",
    "Note": "command-timeline-icon command-timeline-icon-duel-notes",
}