import { YGOCore } from "../../../../YGOCore";
import { YGODuel } from "../../../core/YGODuel";

export function StartHandLogRow({ log, duel, ygo }: { log: any, duel: YGODuel, ygo: YGOCore }) {

    // const card = ygo.state.getCardData(log.id)!;

    // console.log("CARD ", card);

    // if (!card) {
    //     return <div className="ygo-duel-log-default-row">
    //         {log.type}
    //     </div>
    // }

    return <div className="ygo-duel-log-default-row">
        <div className="ygo-text-4">
            DRAW
        </div>
        <div>
            {
                log.cards.map((cardData: any) => {
                    const card = ygo.state.getCardData(cardData.id)!
                    if (!card) return null;
                    return <div>
                        <img
                            src={`${duel.config.cdnUrl}/images/cards_small/${card.id}.jpg`}
                            style={{ width: "40px" }} />
                    </div>
                })
            }
        </div>
    </div>
}