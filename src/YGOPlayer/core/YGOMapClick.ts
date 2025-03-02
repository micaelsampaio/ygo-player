import * as THREE from 'three';
import { YGODuel } from '../core/YGODuel';
import { YGOUiElement } from '../types';
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';
import { YGOComponent } from './YGOComponent';

export class YGOMapClick extends YGOComponent implements YGOUiElement {
    private duel: YGODuel;
    public isActive: boolean;
    public isUiElement: boolean = true;
    public isUiElementClick: boolean = true;
    public isUiElementHover: boolean = true;
    public gameObject: THREE.Object3D;

    constructor(duel: YGODuel) {
        super("map-click-zone");

        this.duel = duel;

        const mapGeometry = new THREE.PlaneGeometry(60, 60);
        const mapMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });

        this.gameObject = new THREE.Mesh(mapGeometry, mapMaterial);
        this.gameObject.position.set(0, 0, -1);
        this.gameObject.visible = false;

        this.duel.core.scene.add(this.gameObject);
        this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);
        this.isActive = false;
    }

    onMouseClick?(event: MouseEvent): void {
        if (!this.isUiElementClick) return;

        event.preventDefault();
        event.stopPropagation();

        const currentAction = this.duel.actionManager.action;

        if (currentAction.uncancellable === true) return;

        this.duel.actionManager.clearAction();
        this.duel.events.dispatch("clear-ui-action");
        this.duel.events.dispatch("set-selected-card", { card: null });
    }
}