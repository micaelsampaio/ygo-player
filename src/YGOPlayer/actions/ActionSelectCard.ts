import * as THREE from 'three';
import { YGOMouseEvents } from "../core/components/YGOMouseEvents";
import { YGOComponent } from "../core/YGOComponent";
import { YGODuel } from "../core/YGODuel";
import { YGOAction } from '../core/components/YGOAction';
import { CardZone } from '../game/CardZone';

export class ActionCardSelection extends YGOComponent implements YGOAction {
    private duel: YGODuel;
    private mouseEvents: YGOMouseEvents;
    private cardSelectionZones: Map<string, THREE.Mesh>;
    private zones!: CardZone[];
    private isMultipleSelection: boolean;
    private selectedZones: CardZone[];
    private onSelectionCompleted!: ((cardZone: CardZone) => void);
    private onMultipleSelectionCompleted!: ((cardZone: CardZone[]) => void);
    private onCancelled: (() => void) | null;

    constructor({ duel }: { duel: YGODuel }) {
        super("");
        this.duel = duel;
        this.cardSelectionZones = new Map();
        this.selectedZones = [];
        this.isMultipleSelection = false;
        this.onCancelled = null;
        this.createCardSelections();
        this.mouseEvents = duel.gameController.getComponent<YGOMouseEvents>("mouse_events")!;
    }

    public onActionStart(): void {
        this.hideAllSelectionCards();

        for (const cardzone of this.zones) {
            this.cardSelectionZones.get(cardzone.zone)!.visible = true;
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
        for (const [, card] of this.cardSelectionZones) {
            card.visible = false;
        }
    }

    public startSelection({ zones, onSelectionCompleted }: { zones: CardZone[], onSelectionCompleted: (cardZone: CardZone) => void }): void {
        this.isMultipleSelection = false;
        this.zones = zones;
        this.onSelectionCompleted = onSelectionCompleted;

        this.duel.actionManager.setAction(this);
    }

    public startMultipleSelection({ zones, onSelectionCompleted, onCancelled = null }: { zones: CardZone[], onSelectionCompleted: (cardZones: CardZone[]) => void, onCancelled?: (() => void) | null }): void {
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
            this.cardSelectionZones.get(zone.zone)!.visible = false;
            const availableZones = Array.from(this.cardSelectionZones.values()).some(c => c.visible);

            if (!availableZones) {
                this.onMultipleSelectionCompletedClick();
            }
        } else {
            this.clear();
            this.onSelectionCompleted(zone);
        }
    }

    private onMultipleSelectionCompletedClick() {
        this.clear();
        this.onMultipleSelectionCompleted(this.selectedZones);
    }

    //////////

    private createCardSelection(position: THREE.Vector3, rotation: THREE.Euler) {
        const geometry = new THREE.BoxGeometry(2.8, 2.8, 0.1);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.copy(position);
        cube.rotation.copy(rotation);
        cube.visible = false;
        this.duel.core.scene.add(cube);
        return cube
    }

    private createCardSelections() {
        for (const field of this.duel.fields) {
            for (const cardZone of field.monsterZone) {
                const card = this.createCardSelection(cardZone.position, cardZone.rotation);
                this.cardSelectionZones.set(cardZone.zone, card);
            }
            for (const cardZone of field.spellTrapZone) {
                const card = this.createCardSelection(cardZone.position, cardZone.rotation);
                this.cardSelectionZones.set(cardZone.zone, card);
            }
        }

        for (const cardZone of this.duel.fields[0].extraMonsterZone) {
            const card = this.createCardSelection(cardZone.position, cardZone.rotation);
            this.cardSelectionZones.set(cardZone.zone, card);
        }

        const fieldSpellCardZone = this.duel.fields[0].fieldZone;
        const fieldSpellCard = this.createCardSelection(fieldSpellCardZone.position, fieldSpellCardZone.rotation);
        this.cardSelectionZones.set(fieldSpellCardZone.zone, fieldSpellCard);
    }

}