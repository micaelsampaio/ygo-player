import { useEffect, useRef, useState } from "react"
import { YGODuel } from "../../../../core/YGODuel";
import { Card } from "ygo-core";

export function MobileSelectedCardButton({ duel, toggle }: { duel: YGODuel, toggle: () => void }) {
    const [glowing, setGlowing] = useState(false);
    const glowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let card: Card | null = null;
        const onSelectedCardChange = (data: any) => {
            if (data?.card?.id && card?.id !== data?.card?.id) {
                card = data.card as Card;

                setGlowing(false);
                if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);

                glowTimeoutRef.current = setTimeout(() => setGlowing(true), 16);
            }
        };

        duel.events.on("set-selected-card", onSelectedCardChange);
        return () => {
            duel.events.off("set-selected-card", onSelectedCardChange);
            if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
        };
    }, []);

    return (
        <button
            className={`ygo-floating-button${glowing ? " ygo-btn-glow" : ""}`}
            onAnimationEnd={() => setGlowing(false)}
            onClick={toggle}
        >
            <svg className="ygo-floating-button-icon" width="957" height="957" viewBox="0 0 957 957" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M794 861C794 883.091 776.091 901 754 901H204C181.909 901 164 883.091 164 861V96C164 73.9086 181.909 56 204 56H754C776.091 56 794 73.9086 794 96V861ZM303.931 145.062C281.84 145.062 263.931 162.97 263.931 185.062V535.164C263.931 557.256 281.84 575.165 303.931 575.165H654.069C676.16 575.165 694.069 557.256 694.069 535.165V185.062C694.069 162.971 676.16 145.062 654.069 145.062H303.931Z" fill="white" />
            </svg>
        </button>
    );
}