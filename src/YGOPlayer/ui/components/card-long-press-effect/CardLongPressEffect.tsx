import { useEffect, useRef, useState } from "react";
import { YGODuel } from "../../../core/YGODuel";
import { Card } from "ygo-core";
import { clamp } from "three/src/math/MathUtils";
import "./style.css";

export function CardLongPressEffect({ duel }: { duel: YGODuel }) {

    const selectedCard = useRef<Card | null>(null);
    const [mousePosition, setMousePosition] = useState<{ top: string, left: string }>({ top: "0", left: "0" });
    const [value, setValue] = useState(50);
    const [isActive, setIsActive] = useState(false);
    const timer = useRef<number>(-1);

    const startTimerToDelay = () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            startTimerToOpenCard();
        }, 300) as any as number;
    };

    const startTimerToOpenCard = () => {
        const startTime = Date.now();

        const update = () => {
            const currentTime = Date.now();
            const maxTime = 0.75 * 1000;
            const elapsed = currentTime - startTime;
            const clamped = Math.min(elapsed, maxTime);
            const progress = clamp((clamped / maxTime) * 100, 0, 100);

            setValue(progress);

            if (progress < 100) {
                clearTimeout(timer.current);
                timer.current = setTimeout(update, 16) as any as number;
            } else {
                openCard();
            }
        };

        clearTimeout(timer.current);
        setIsActive(true);
        update();
    };

    const openCard = () => {
        clearTimeout(timer.current);
        if (!selectedCard.current) return;

        duel.events.dispatch("toggle-ui-menu", {
            group: "card-highlight",
            type: "selected-card-highlight",
            data: {
                duel,
                card: selectedCard.current
            }
        });
        setIsActive(false);
    }

    useEffect(() => {
        duel.events.on("on-card-mouse-down", ({ event, card }: { event: MouseEvent, card: Card }) => {
            if (event.type === "mousedown") {
                if (event.button > 1 || event.button < 0) return;
            }

            startTimerToDelay();
            selectedCard.current = card;

            const rect = duel.core.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            setMousePosition({ left: `${x}px`, top: `${y}px` });
        })

        duel.events.on("on-card-mouse-up", (data: any) => {
            clearTimeout(timer.current);
            setIsActive(false);
            selectedCard.current = null;
        })

        return () => {
            clearTimeout(timer.current);
        }
    }, [duel]);

    if (!isActive) return null;

    return (
        <div className="ygo-card-long-press-effect" style={mousePosition}>
            <svg className="ygo-progress-ring" width="40" height="40" viewBox="0 0 40 40">
                <circle
                    className="ygo-ring-bg"
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    strokeWidth="4"
                />
                <circle
                    className="ygo-ring-fill"
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={Math.PI * 2 * 16}
                    strokeDashoffset={(1 - value / 100) * Math.PI * 2 * 16}
                />
            </svg>

        </div>
    );

}
