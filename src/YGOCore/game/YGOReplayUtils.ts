import { Card, FieldZone, FileldStateEntry as YGOCardFieldState, YGOReplayData } from "../types/types";
import { YGOCore } from "./YGOCore";
import { YGOGameUtils } from "./YGOGameUtils";

export class YGOReplayUtils {
    static createReplayData(ygo: YGOCore): YGOReplayData {
        const players = ygo.props.players.map((playerData, playerIndex) => {
            const field = ygo.getField(playerIndex);
            return {
                name: playerData.name,
                mainDeck: field.data.mainDeckOrdered,
                extraDeck: field.data.extraDeckOrdered,
            }
        });

        const commands = ygo.commands.map(cmd => cmd.toJSON());
        const endField: YGOCardFieldState[] = [];
        const initialField: YGOCardFieldState[] = [];

        if (ygo.props.options?.fieldState) {
            ygo.props.options.fieldState.forEach(s => initialField.push(s));
        }

        for (let playerIndex = 0; playerIndex < ygo.state.fields.length; ++playerIndex) {
            const field = ygo.getField(playerIndex);

            for (let i = 0; i < field.monsterZone.length; ++i) {
                if (field.monsterZone[i]) {
                    const card = field.monsterZone[i]!;
                    const zone = YGOGameUtils.createZone("M", playerIndex, i + 1);
                    endField.push(this.getMonsterCardInfo(card, zone));
                }
            }

            for (let i = 0; i < field.spellTrapZone.length; ++i) {
                if (field.spellTrapZone[i]) {
                    const card = field.spellTrapZone[i]!;
                    const zone = YGOGameUtils.createZone("S", playerIndex, i + 1);
                    endField.push({ id: card.id, zone });
                }
            }

            for (let i = 0; i < field.extraMonsterZone.length; ++i) {
                if (field.extraMonsterZone[i]) {
                    const card = field.extraMonsterZone[i]!;
                    const zone = YGOGameUtils.createZone("EMZ", playerIndex, i + 1);
                    endField.push(this.getMonsterCardInfo(card, zone));
                }
            }

            for (let i = 0; i < field.graveyard.length; ++i) {
                const card = field.graveyard[i];
                const zone = YGOGameUtils.createZone("GY", playerIndex);
                endField.push({ id: card.id, zone });
            }

            for (let i = 0; i < field.banishedZone.length; ++i) {
                const card = field.banishedZone[i];
                const zone = YGOGameUtils.createZone("B", playerIndex);
                const result: any = { id: card.id, zone };

                if (YGOGameUtils.isFaceDown(card)) {
                    result.position = "facedown"
                }

                endField.push(result);
            }
        }

        // todo get end field etc..
        return {
            players,
            commands,
            initialField,
            endField
        }
    }

    private static getMonsterCardInfo(card: Card, zone: FieldZone): any {
        const result: any = {
            id: card.id,
            zone
        }

        if (card.atk !== card.currentAtk) {
            result.atk = card.currentAtk;
        }

        if (card.def !== card.currentDef) {
            result.def = card.currentDef;
        }

        if (card.position !== "faceup-attack") {
            result.position = card.position;
        }

        if (card.materials.length > 0) {
            result.materials = card.materials.map(materialCard => ({ id: materialCard.id })); // TODO OWner of the card
        }

        return result;
    }
}