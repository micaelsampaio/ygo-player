import { DuelEventHandlerProps } from ".";
import { YGODuelEvents } from "../../YGOCore";
import { GameCard } from "../game/GameCard";

interface NormalSummonProps extends DuelEventHandlerProps {
    event: YGODuelEvents.NormalSummon,
}

export function* normalSummonEventHandler({ duel, event, onCompleted }: NormalSummonProps) {
    const card = duel.ygo.state.getCardById(event.id, event.zone);
    const gameCard = new GameCard({
        duel: duel,
        card
    });
    gameCard.gameObject.visible = false;

    yield;

    gameCard.gameObject.visible = true;

    const getPRS = (zoneToFind: string) => {
        const field = duel.fields[0];

        if (zoneToFind.startsWith("M")) {
            const zoneIndex = Number(zoneToFind.split("-")[1]) - 1;
            const zone = field.monsterZone[zoneIndex];
            const { rotation } = zone.getCardPositionAndRotation(card);
            return { zone, position: zone.position, rotation, scale: 1 };
        } else if (zoneToFind.startsWith("S")) {
            const zoneIndex = Number(zoneToFind.split("-")[1]) - 1;
            const zone = field.spellTrapZone[zoneIndex];
            const { rotation } = zone.getCardPositionAndRotation(card);
            return { zone, position: zone.position, rotation, scale: 1 };
        } else if (zoneToFind.startsWith("EMZ")) {
            const zoneIndex = Number(zoneToFind.split("-")[1]) - 1;
            const zone = field.extraMonsterZone[zoneIndex];
            const { rotation } = zone.getCardPositionAndRotation(card);
            return { zone, position: zone.position, rotation, scale: 1 };
        } else if (zoneToFind.startsWith("GY")) {
            const zone = field.graveyard.gameObject;
            const position = zone.position.clone();
            const rotation = zone.rotation.clone();
            return { position, rotation, scale: 1 };
        } else if (zoneToFind.startsWith("H")) {
            const zoneIndex = Number(zoneToFind.split("-")[1]) - 1;
            const zone = field.hand.cards[zoneIndex];
            const position = zone.gameObject.position.clone();
            const rotation = zone.gameObject.rotation.clone();
            return { position, rotation, scale: 1 };
        }

        const zoneIndex = Number(zoneToFind.split("-")[1]) - 1;
        const zone = field.monsterZone[zoneIndex];
        const { rotation } = zone.getCardPositionAndRotation(card);
        return { zone, position: zone.position, rotation, scale: 1 };
    }


    const startData = getPRS(event.originZone);
    const endData = getPRS(event.zone);

    if (event.originZone.includes("H-")) {
        duel.updateHand(0);
    }

    gameCard.gameObject.rotation.copy(endData?.rotation);

    let startTime = Date.now();

    while (Date.now() - startTime < 250) {
        let time = (Date.now() - startTime) / 250;

        const pos = startData.position.clone().lerpVectors(startData.position, endData.position, time);
        gameCard.gameObject.position.copy(pos);

        yield null;
    }

    if (endData.zone) {
        endData.zone.setCard(gameCard);
        endData.zone.reconcileCardWithState(card);
    } else {
        gameCard.destroy();
    }

    onCompleted();
}