import { YGODuel } from "../../core/YGODuel";
import { CardMenu } from "../components/CardMenu";

export function CardMultipleSelectionMenu({ duel, onCompleted }: { duel: YGODuel, onCompleted: () => void }) {
    const x = window.innerWidth / 2 + 200; //  mouseEvent.clientX; // Horizontal mouse position in px
    const y = window.innerHeight / 2 - 30; // mouseEvent.clientY; // Vertical mouse position in px

    const onCompletedClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onCompleted();
    }

    return <>
        <CardMenu x={x} y={y}>
            <button type="button" className="ygo-card-item" style={{ fontSize: "20px" }} onClick={onCompletedClick}>Decide</button>
        </CardMenu>
    </>

}