import { stopPropagationCallback } from "../../scripts/utils";
import { ActionsFloatingMenu } from "../components/ActionsFloatingMenu";

export function CardMultipleSelectionMenu({ showConfirm = true, onCompleted, ...props }: { showConfirm?: boolean, onCompleted: () => void }) {
    const x = window.innerWidth / 2 + 200; //  mouseEvent.clientX; // Horizontal mouse position in px
    const y = window.innerHeight / 2 - 30; // mouseEvent.clientY; // Vertical mouse position in px

    const onCompletedClick = (e: React.MouseEvent) => {
        stopPropagationCallback(e);
        onCompleted();
    }

    if (!showConfirm || !onCompletedClick) return null;

    return <>
        <ActionsFloatingMenu x={x} y={y}>
            <div className="ygo-floating-button ygo-floating-button-confirm" onClick={onCompletedClick}>
                Confirm
            </div>
        </ActionsFloatingMenu>
    </>

}