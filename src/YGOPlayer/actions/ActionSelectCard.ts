import * as THREE from 'three';
import { YGOMouseEvents } from "../core/components/YGOMouseEvents";
import { YGOComponent } from "../core/YGOComponent";
import { YGODuel } from "../core/YGODuel";
import { YGOAction } from '../core/components/YGOAction';
import { CardZone } from '../game/CardZone';
import { createCardSelectionGeometry } from '../game/meshes/CardSelectionMesh';
import { YGOTaskSequence } from '../core/components/tasks/YGOTaskSequence';
import { MultipleTasks } from '../duel-events/utils/multiple-tasks';
import { PositionTransition } from '../duel-events/utils/position-transition';
import { ScaleTransition } from '../duel-events/utils/scale-transition';
import { MaterialOpacityTransition } from '../duel-events/utils/material-opacity';

type CardSelectionType = "card" | "zone";

export class ActionCardSelection extends YGOComponent implements YGOAction {
    private duel: YGODuel;
    private mouseEvents: YGOMouseEvents;
    private cardSelectionZones: Map<string, { card: THREE.Mesh, zone: THREE.Mesh }>;
    private zones!: CardZone[];
    private isMultipleSelection: boolean;
    private selectionType: CardSelectionType;
    private selectedZones: CardZone[];
    private onSelectionCompleted!: ((cardZone: CardZone) => void);
    private onMultipleSelectionCompleted!: ((cardZone: CardZone[]) => void);
    private onCancelled: (() => void) | null;

    constructor({ duel }: { duel: YGODuel }) {
        super("");
        this.duel = duel;
        this.cardSelectionZones = new Map();
        this.selectedZones = [];
        this.selectionType = "zone";
        this.isMultipleSelection = false;
        this.onCancelled = null;
        this.mouseEvents = duel.gameController.getComponent<YGOMouseEvents>("mouse_events")!;
    }

    public onActionStart(): void {
        this.hideAllSelectionCards();

        for (const cardzone of this.zones) {

            if (this.selectionType === "zone") {
                this.cardSelectionZones.get(cardzone.zone)!.zone.visible = true;
            } else {
                this.cardSelectionZones.get(cardzone.zone)!.card.visible = true;
            }
            cardzone.onClickCb = () => this.onCardZoneClick(cardzone);
        }

        this.mouseEvents.onClickCb = ({ elements }: any) => {
            if (elements.length > 0) {
                const clickElement = elements[0].object;
                const selectedZone = this.zones.find(zone => zone.gameObject === clickElement);

                if (selectedZone) {
                    return;
                }
            }

            this.cancelSelection();
        };

        if (this.isMultipleSelection) {
            this.duel.events.publish("set-ui-action", {
                type: "card-multiple-selection-menu",
                data: {
                    onCompleted: this.onMultipleSelectionCompletedClick.bind(this)
                }
            });
        }
    }

    public onActionEnd(): void {
        this.clear();
        this.duel.events.publish("clear-ui-action");
    }

    private clear() {
        this.mouseEvents.onClickCb = null;
        this.onCancelled = null;
        this.hideAllSelectionCards();
        this.zones.forEach(zone => zone.onClickCb = null);
    }

    private hideAllSelectionCards() {
        for (const [, zoneData] of this.cardSelectionZones) {
            zoneData.card.visible = false;
            zoneData.zone.visible = false;
        }
    }

    public startSelection({ zones, selectionType, onSelectionCompleted }: { zones: CardZone[], selectionType: CardSelectionType, onSelectionCompleted: (cardZone: CardZone) => void }): void {
        this.selectionType = selectionType;
        this.isMultipleSelection = false;
        this.zones = zones;
        this.onSelectionCompleted = onSelectionCompleted;

        this.duel.actionManager.setAction(this);
    }

    public startMultipleSelection({ zones, selectionType, onSelectionCompleted, onCancelled = null }: { zones: CardZone[], selectionType: CardSelectionType, onSelectionCompleted: (cardZones: CardZone[]) => void, onCancelled?: (() => void) | null }): void {
        this.selectionType = selectionType;
        this.isMultipleSelection = true;
        this.zones = zones;
        this.selectedZones = [];
        this.zones.forEach(zone => zone.onClickCb = () => this.onCardZoneClick(zone));
        this.onMultipleSelectionCompleted = onSelectionCompleted;
        this.onCancelled = onCancelled;

        this.duel.actionManager.setAction(this);
    }

    public cancelSelection() {
        this.clear();
        this.duel.actionManager.clearAction();
        this.duel.events.publish("clear-ui-action");
    }

    private onCardZoneClick(zone: CardZone) {
        if (this.isMultipleSelection) {
            this.selectedZones.push(zone);
            if (this.selectionType === "zone") {
                this.cardSelectionZones.get(zone.zone)!.zone.visible = false;
            } else {
                this.cardSelectionZones.get(zone.zone)!.card.visible = false;
            }

            this.clickOnZone(zone.position);

            zone.onClickCb = () => { };

            let availableZones = false;
            if (this.selectionType === "zone") {
                availableZones = Array.from(this.cardSelectionZones.values()).some(c => c.zone.visible);
            } else {
                availableZones = Array.from(this.cardSelectionZones.values()).some(c => c.card.visible);
            }

            if (!availableZones) {
                this.onMultipleSelectionCompletedClick();
            }
        } else {
            this.clear();
            this.onSelectionCompleted(zone);
            this.clickOnZone(zone.position);
        }
    }

    private onMultipleSelectionCompletedClick() {
        this.clear();
        this.onMultipleSelectionCompleted(this.selectedZones);
    }

    //////////

    private createCardSelection(position: THREE.Vector3, rotation: THREE.Euler) {
        const cardSelection = createCardSelectionGeometry(2.4, 2.8, 0.15);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 1, transparent: true });
        const cardSelectionMesh = new THREE.Mesh(cardSelection, material);

        cardSelectionMesh.position.copy(position);
        cardSelectionMesh.rotation.copy(rotation);
        cardSelectionMesh.position.z += 0.02;
        cardSelectionMesh.visible = false;
        this.duel.core.scene.add(cardSelectionMesh);

        return cardSelectionMesh;
    }

    private createCardZoneSelection(position: THREE.Vector3, rotation: THREE.Euler) {

        const cardSelection = createCardSelectionGeometry(2.8, 2.8, 0.15);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 1, transparent: true });
        const cardSelectionMesh = new THREE.Mesh(cardSelection, material);

        cardSelectionMesh.position.copy(position);
        cardSelectionMesh.rotation.copy(rotation);
        cardSelectionMesh.position.z += 0.02;
        cardSelectionMesh.visible = false;
        this.duel.core.scene.add(cardSelectionMesh);

        return cardSelectionMesh;
    }

    public createCardSelections() {
        for (const field of this.duel.fields) {
            for (const cardZone of field.monsterZone) {
                const card = this.createCardSelection(cardZone.position, cardZone.rotation);
                const zone = this.createCardZoneSelection(cardZone.position, cardZone.rotation);
                this.cardSelectionZones.set(cardZone.zone, { card, zone });

            }
            for (const cardZone of field.spellTrapZone) {
                const card = this.createCardSelection(cardZone.position, cardZone.rotation);
                const zone = this.createCardZoneSelection(cardZone.position, cardZone.rotation);
                this.cardSelectionZones.set(cardZone.zone, { card, zone });
            }
        }

        for (const cardZone of this.duel.fields[0].extraMonsterZone) {
            const card = this.createCardSelection(cardZone.position, cardZone.rotation);
            const zone = this.createCardZoneSelection(cardZone.position, cardZone.rotation);
            this.cardSelectionZones.set(cardZone.zone, { card, zone });
        }

        const fieldSpellCardZone = this.duel.fields[0].fieldZone;
        const fieldSpellCard = this.createCardSelection(fieldSpellCardZone.position, fieldSpellCardZone.rotation);
        const fieldSpellZone = this.createCardZoneSelection(fieldSpellCardZone.position, fieldSpellCardZone.rotation);
        this.cardSelectionZones.set(fieldSpellCardZone.zone, { card: fieldSpellCard, zone: fieldSpellZone });
    }


    private clickOnZone(position: THREE.Vector3) {

        const zoneClick = this.createCardSelection(position, new THREE.Euler(0, 0, 0));
        zoneClick.visible = true;

        const targetPosition = position.clone();
        targetPosition.z += 0.25;
        const scale = zoneClick.scale.clone();
        scale.multiplyScalar(1.2);

        const seq = new MultipleTasks(
            new PositionTransition({
                gameObject: zoneClick,
                position: targetPosition,
                duration: 0.15
            }),
            new ScaleTransition({
                gameObject: zoneClick,
                scale,
                duration: 0.15
            }),
            new MaterialOpacityTransition({
                material: zoneClick.material,
                opacity: 0,
                duration: 0.15
            })
        )
        this.duel.tasks.startTask(seq, {
            onCompleted: () => {
                this.duel.core.scene.remove(zoneClick);
            }
        });
    }

}