import * as THREE from 'three';
import { YGODuel } from "../core/YGODuel";
import { YGOMath } from '../core/YGOMath';
import { PlayerField } from '../game/PlayerField';
import { CardZone } from '../game/CardZone';
import { GameHand } from '../game/Hand';
import { Deck } from '../game/Deck';
import { Graveyard } from '../game/Graveyard';
import { ExtraDeck } from '../game/ExtraDeck';
import { Card, FieldZone, FieldZoneData } from '../../YGOCore/types/types';
import { YGOGameUtils } from '../../YGOCore';
import { Banish } from '../game/Banish';

type CreateFieldDto = {
    duel: YGODuel
    fieldModel: THREE.Scene
}

export function createFields({ duel, fieldModel }: CreateFieldDto) {

    fieldModel.rotation.copy(YGOMath.degToRadEuler(90, 0, 0));
    fieldModel.position.set(0, 0, 0);

    const zones: any = [];
    const offsetY = 0.1;

    fieldModel.children.forEach((child: any) => {
        if (child.isMesh) {
            const position = child.position;
            position.y += offsetY;

            child.visible = false;

            // if (child.name === "M-1") {
            //     child.material = new THREE.MeshBasicMaterial({
            //         color: 0xff00ff,
            //         side: THREE.DoubleSide // Make the material double-sided
            //     });
            // } else {
            //     child.material = new THREE.MeshBasicMaterial({
            //         color: 0xff0000,
            //         side: THREE.DoubleSide // Make the material double-sided
            //     });
            // }

            zones[child.name] = child;
        }
    });

    const fields: PlayerField[] = [];

    for (let player = 0; player < 2; ++player) {
        const field = new PlayerField();
        const playerSufix = player === 0 ? '' : '2';

        for (let i = 0; i < 5; ++i) {
            const monsterZoneId: any = `M${playerSufix}-${i + 1}`;
            const spellZoneId: any = `S${playerSufix}-${i + 1}`;

            const monsterZone = createCardZone(duel, player, monsterZoneId, zones[monsterZoneId]);
            const spellZone = createCardZone(duel, player, spellZoneId, zones[spellZoneId]);

            field.monsterZone.push(monsterZone);
            field.spellTrapZone.push(spellZone);
        }

        for (let i = 0; i < 2; ++i) {
            const extraMonsterZoneGlobalId: any = `EMZ-${i + 1}`;
            const extraMonsterZoneId: any = `EMZ${playerSufix}-${i + 1}`;
            const extraMonsterZone = createCardZone(duel, player, extraMonsterZoneId, zones[extraMonsterZoneGlobalId]);
            field.extraMonsterZone.push(extraMonsterZone);
        }

        // if (player === 0) {
        //     for (let i = 0; i < 5; ++i) {
        //         const card = new GameCardHand({ duel });
        //         card.gameObject.position.set(-4 + i * 2.2, 6, 6);
        //         card.gameObject.rotation.set(YGOMath.degToRad(270), 0, 0);
        //     }
        // }

        if (player === 0) {
            const mainDeckPosition = zones["D"].position.clone();
            field.mainDeck = new Deck({ duel, player, zone: "D", position: mainDeckPosition });
            field.banishedZone = new Banish({ duel, player, zone: "D", position: mainDeckPosition });
            field.graveyard = new Graveyard({ duel, player, zone: "GY", position: mainDeckPosition });
            field.extraDeck = new ExtraDeck({ duel, player, zone: "ED", position: mainDeckPosition });
        }

        const fieldZoneId: FieldZone = `F${playerSufix}`;
        field.fieldZone = createCardZone(duel, player, fieldZoneId, zones[fieldZoneId]);
        field.hand = new GameHand(duel, player);

        fields.push(field);
    }

    return fields;
}

function createCardZone(duel: YGODuel, player: number, zone: FieldZone, zoneObject: THREE.Mesh): CardZone {
    const cardZone = new CardZone({
        duel,
        zone,
        player,
        position: zoneObject.getWorldPosition(new THREE.Vector3()),
        rotation: player === 0 ? YGOMath.degToRadEuler(0, 0, 0) : YGOMath.degToRadEuler(0, 0, 180),
    });

    return cardZone;
}

export function getMonstersZones(duel: YGODuel, players: number[]): CardZone[] {
    const result: CardZone[] = [];

    players.forEach(player => {
        duel.fields[player].monsterZone.forEach(zone => {
            if (zone.hasCard()) result.push(zone);
        });

        duel.fields[player].extraMonsterZone.forEach(zone => {
            if (zone.hasCard()) result.push(zone);
        });
    });

    return result;
}

export function getXyzMonstersZones(duel: YGODuel, players: number[]): CardZone[] {
    const result: CardZone[] = [];

    players.forEach(player => {
        duel.fields[player].monsterZone.forEach(zone => {
            if (zone.hasCard() && YGOGameUtils.isXYZMonter(zone.getCardReference()!)) result.push(zone);
        });

        duel.fields[player].extraMonsterZone.forEach(zone => {
            if (zone.hasCard() && YGOGameUtils.isXYZMonter(zone.getCardReference()!)) result.push(zone);
        });
    });

    return result;
}

export function getCardZones(duel: YGODuel, players: number[], zones: ("M" | "S" | "F" | "EMZ")[]): CardZone[] {

    const result: CardZone[] = [];

    players.forEach(player => {
        zones.forEach(zone => {
            let zonesToFind: CardZone[] | undefined;

            switch (zone) {
                case 'M':
                    zonesToFind = duel.fields[player].monsterZone;
                    break;
                case 'S':
                    zonesToFind = duel.fields[player].spellTrapZone;
                    break;
                case 'EMZ':
                    zonesToFind = duel.fields[player].extraMonsterZone;
                    break;
                case 'F':
                    if (duel.fields[player].fieldZone.isEmpty()) {
                        result.push(duel.fields[player].fieldZone);
                    }
                    break;
            }

            if (zonesToFind) {
                zonesToFind.forEach(zone => {
                    if (zone.isEmpty()) {
                        result.push(zone);
                    }
                })
            }

        });
    });

    return result;
}

export function cancelMouseEventsCallback(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
}

export function getCardRotation(card: Card, zone: FieldZone) {
    const zoneData = YGOGameUtils.getZoneData(zone);
    return getCardRotationFromFieldZoneData(card, zoneData);
}

export function getCardRotationFromFieldZoneData(card: Card, zoneData: FieldZoneData) {
    let rotation: THREE.Euler = new THREE.Euler(0, 0, 0);

    if (zoneData.zone === "GY") {
        // GY do nothig let go as default rotation
    } else if (zoneData.zone === "H") {
        // GY do nothig let go as default rotation
    } else if (zoneData.zone === "D") {
        rotation.y = THREE.MathUtils.degToRad(180);
    } else if (zoneData.zone === "B") {
        if (YGOGameUtils.isFaceDown(card)) {
            rotation.y = THREE.MathUtils.degToRad(180);
        }
        rotation.z = THREE.MathUtils.degToRad(90);
    } else if (zoneData.zone === "S") {
        if (YGOGameUtils.isFaceDown(card)) {
            rotation.y = THREE.MathUtils.degToRad(180);
        }
    } else if (zoneData.zone === "F") {
        if (YGOGameUtils.isFaceDown(card)) {
            rotation.y = THREE.MathUtils.degToRad(180);
        }
    } else { // monster or extra monster zone
        if (!YGOGameUtils.isLinkMonster(card)) { // TODO FIX DEF NOT WORKING
            if (YGOGameUtils.isFaceDown(card)) {
                rotation.y = THREE.MathUtils.degToRad(180);
                if (YGOGameUtils.isDefense(card)) {
                    rotation.z = THREE.MathUtils.degToRad(-90);
                }
            } else {
                if (YGOGameUtils.isDefense(card)) {
                    rotation.z = THREE.MathUtils.degToRad(90);
                }
            }
        }
    }

    if (zoneData.player === 1) {
        rotation.z += THREE.MathUtils.degToRad(180);
    }

    return rotation;
}
export function getZonePosition(duel: YGODuel, zone: FieldZone) {
    const zoneData = YGOGameUtils.getZoneData(zone);
    return getZonePositionFromZoneData(duel, zoneData);
}

export function getZonePositionFromZoneData(duel: YGODuel, zoneData: FieldZoneData) {
    let position: THREE.Vector3;
    const zoneIndex = zoneData.zoneIndex! - 1;
    const field = duel.fields[zoneData.player];

    if (zoneData.zone === "M") {
        position = field.monsterZone[zoneIndex].position;
    } else if (zoneData.zone === "S") {
        position = field.spellTrapZone[zoneIndex].position;
    } else if (zoneData.zone === "H") {
        const cardInHand = field.hand.getCard(zoneIndex);
        position = cardInHand ? cardInHand.gameObject.position : field.monsterZone[0].position;
    } else if (zoneData.zone === "EMZ") {
        position = field.extraMonsterZone[zoneIndex].gameObject.position;
    } else if (zoneData.zone === "GY") {
        position = field.graveyard.gameObject.position;
    } else if (zoneData.zone === "B") {
        position = field.banishedZone.gameObject.position;
    } else if (zoneData.zone === "D") {
        position = field.deck.gameObject.position;
    } else if (zoneData.zone === "ED") {
        position = field.extraDeck.gameObject.position;
    } else {
        position = field.monsterZone[0].position;
    }

    return position;
}

const FIELD_ZONES = ["M", "S", "F", "EMZ"]
export function isFieldZone(zoneData: FieldZoneData) {
    return FIELD_ZONES.includes(zoneData.zone);
}

export function getGameZone(duel: YGODuel, zoneData: FieldZoneData): CardZone | null {
    const field = duel.fields[zoneData.player];

    if (isFieldZone(zoneData)) {
        switch (zoneData.zone) {
            case "F":
                return field.fieldZone;
            case "S":
                return field.spellTrapZone[zoneData.zoneIndex - 1];
            case "EMZ":
                return field.extraMonsterZone[zoneData.zoneIndex - 1];
            default:
                return field.monsterZone[zoneData.zoneIndex - 1];
        }
    }

    return null;
}