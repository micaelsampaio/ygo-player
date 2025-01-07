import * as THREE from 'three';
import { YGODuel } from "../core/YGODuel";
import { YGOMath } from '../core/YGOMath';
import { PlayerField } from '../game/PlayerField';
import { CardZone } from '../game/CardZone';
import { GameHand } from '../game/Hand';
import { Deck } from '../game/Deck';
import { Graveyard } from '../game/Graveyard';
import { ExtraDeck } from '../game/ExtraDeck';
import { FieldZone } from '../../YGOCore/types/types';
import { YGODuelEvents, YGOGameUtils } from '../../YGOCore';
import { Banish } from '../game/Banish';
import { getDuelEventHandler } from '../duel-events';

type CreateFieldDto = {
    duel: YGODuel
    fieldModel: THREE.Scene
}

export function createFields({ duel, fieldModel }: CreateFieldDto) {

    console.log("CREATE FIELDS", fieldModel);

    const zones: any = [];
    const offsetY = 0.1;

    fieldModel.children.forEach((child: any) => {
        if (child.isMesh) {
            const position = child.position;
            position.y += offsetY;

            // child.material = new THREE.MeshBasicMaterial({
            //     color: 0xff0000
            // });

            zones[child.name] = child;

            // zone: child.name,
            //     position,
            //     rotation: side === 0 ? YGOMath.degToRadEuler(270, 0, 0) : YGOMath.degToRadEuler(270, 0, 180),
            //     gameObject: child,
            //     side,

            // const data: GameFieldLocation = {

            // }

            // fieldLocations.set(child.name, data);
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
        position: zoneObject.position.clone(),
        rotation: player === 0 ? YGOMath.degToRadEuler(270, 0, 0) : YGOMath.degToRadEuler(270, 0, 180),
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
            if (zone.hasCard() && YGOGameUtils.isXYZMonter(zone.card!.cardReference)) result.push(zone);
        });

        duel.fields[player].extraMonsterZone.forEach(zone => {
            if (zone.hasCard() && YGOGameUtils.isXYZMonter(zone.card!.cardReference)) result.push(zone);
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

export function handleDuelEvent(duel: YGODuel, event: YGODuelEvents.DuelLog) {
    const taskManager = duel.tasks;
    const handler = getDuelEventHandler(event);

    if (!handler) {
        if (taskManager.isProcessing()) taskManager.complete();
        duel.updateField();
        return;
    }

    const onCompleted = () => duel.updateField();

    const props = {
        duel,
        event,
        onCompleted
    };

    taskManager.process(handler(props));
}