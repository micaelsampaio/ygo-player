import { YGODuel } from "../../core/YGODuel";

export function CardMultipleSelectionMenu({ duel, onCompleted }: { duel: YGODuel, onCompleted: () => void }) {
    const x = window.innerWidth / 2; //  mouseEvent.clientX; // Horizontal mouse position in px
    const y = window.innerHeight / 2; // mouseEvent.clientY; // Vertical mouse position in px

    const onCompletedClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onCompleted();
    }

    return <>
        <div className="ygo-card-menu" style={{ top: `${y}px`, left: `${x}px` }}>
            <button type="button" style={{ fontSize: "20px" }} onClick={onCompletedClick}>Decide</button>
        </div>
    </>

}