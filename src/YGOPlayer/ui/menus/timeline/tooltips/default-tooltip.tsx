import { memo } from "react";
import { TimelineCommandProps } from "../../timeline";

export const DefaultCommandTooltip = memo(function ({ command }: TimelineCommandProps) {
    return <div className="command-tooltip">{(command as any).type}</div>
})