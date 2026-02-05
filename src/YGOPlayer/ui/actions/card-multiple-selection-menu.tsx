import { stopPropagationCallback } from "../../scripts/utils";
import { ActionsFloatingMenu } from "../components/ActionsFloatingMenu";

export function CardMultipleSelectionMenu({ showConfirm = true, confirmButtonPivot, onCompleted }: { showConfirm?: boolean, confirmButtonPivot?: { x: number, y: number }, onCompleted: () => void }) {
    const x = confirmButtonPivot?.x ?? window.innerWidth / 2 + 200;
    const y = confirmButtonPivot?.y ?? window.innerHeight / 2 - 30;

    const onCompletedClick = (e: React.MouseEvent) => {
        stopPropagationCallback(e);
        onCompleted();
    }

    if (!showConfirm || !onCompletedClick) return null;

    return <>
        <ActionsFloatingMenu x={x} y={y} transform="translate(-50%, -50%)" >
            <div className="ygo-floating-button ygo-floating-button-confirm" onClick={onCompletedClick}>
                Confirm
            </div>
        </ActionsFloatingMenu >
    </>

}