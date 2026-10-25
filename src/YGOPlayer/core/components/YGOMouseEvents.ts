import * as THREE from 'three';
import { YGOComponent } from "../YGOComponent";
import type { YGODuel } from "../YGODuel";
import { YGOUiElement } from '../../types';
import { EventBus } from '../../scripts/event-bus';

/** A registered element, as seen from its game object (set by registerElement). */
type UiElementRef = YGOUiElement & { isGameHandZone?: boolean; handIndex?: number };
type UiObject = THREE.Object3D & { uiElementRef?: UiElementRef };
type UiIntersection = THREE.Intersection<UiObject>;
type MouseClickArgs = { event: MouseEvent; elements: UiIntersection[] };

export interface YGOMouseEventsEvents {
    click: (args: MouseClickArgs) => void;
}

/**
 * Drags that start on a game object (YGOHandDrag: a card dragged from the hand) get the pointer
 * events here; while one is dragging, hover and click handling stand aside.
 */
export interface YGOPointerDragHandler {
    /** A pointer went down on the canvas over `element` (the hand card preferred, as for clicks). */
    onPointerDown(event: PointerEvent, element: YGOUiElement | null): void;
    onPointerMove(event: PointerEvent): void;
    onPointerUp(event: PointerEvent): void;
    onPointerCancel(event: PointerEvent): void;
    isDragging(): boolean;
    /** True once for the click that ends a drag (it is not a click on what lies under the pointer). */
    consumeClick(): boolean;
}

/** Marks a click its element fully answered (a double-click's pick): nothing else takes it. */
export function markClickHandled(event: MouseEvent) {
    (event as MouseEvent & { ygoClickHandled?: boolean }).ygoClickHandled = true;
}

function isClickHandled(event: MouseEvent): boolean {
    return !!(event as MouseEvent & { ygoClickHandled?: boolean }).ygoClickHandled;
}

export class YGOMouseEvents extends YGOComponent {
    private elements: Set<YGOUiElement>;
    private camera: THREE.Camera;
    private raycaster: THREE.Raycaster;
    /** The game object pressed on mouse down (compared on mouse up / click). */
    private mouseDownElement: UiObject | null;
    private hoverElement: YGOUiElement | null;
    public mousePositionOnScreen: THREE.Vector2 = new THREE.Vector2(0, 0);
    public events: EventBus<YGOMouseEventsEvents>;

    public onClickCb: ((args: MouseClickArgs) => void) | null | undefined;
    public dragHandler: YGOPointerDragHandler | null = null;
    // Spread as React props on the player root (YgoDuelApp), whose handlers get React mouse events.
    public eventsReference: any = {};

    constructor(duel: YGODuel) {
        super("mouse_events");
        this.elements = new Set();
        this.camera = duel.core.camera;
        this.raycaster = new THREE.Raycaster();
        this.hoverElement = null;
        this.mouseDownElement = null;
        this.events = new EventBus();
    }

    public start(): void {
        this.eventsReference.onMouseDown = this.event_OnMouseDown.bind(this);
        this.eventsReference.onMouseUp = this.event_OnMouseUp.bind(this);
        this.eventsReference.onMouseMove = this.event_OnMouseMove.bind(this);
        this.eventsReference.onClick = this.event_OnMouseClick.bind(this);
        // Pointer events (mouse and touch alike) only feed drags; clicks and hover stay on the mouse events.
        this.eventsReference.onPointerDown = (e: { nativeEvent: PointerEvent }) => this.event_OnPointerDown(e.nativeEvent);
        this.eventsReference.onPointerMove = (e: { nativeEvent: PointerEvent }) => this.dragHandler?.onPointerMove(e.nativeEvent);
        this.eventsReference.onPointerUp = (e: { nativeEvent: PointerEvent }) => this.dragHandler?.onPointerUp(e.nativeEvent);
        this.eventsReference.onPointerCancel = (e: { nativeEvent: PointerEvent }) => this.dragHandler?.onPointerCancel(e.nativeEvent);
    }

    /** The objects among `objects` under the screen point (same projection as the clicks). */
    public raycastObjects(clientX: number, clientY: number, objects: THREE.Object3D[]): THREE.Intersection[] {
        const mouse = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
        this.raycaster.setFromCamera(mouse, this.camera);
        return this.raycaster.intersectObjects(objects, false);
    }

    /** The camera ray through a screen point (same projection as the clicks). */
    public rayAt(clientX: number, clientY: number): THREE.Ray {
        const mouse = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
        this.raycaster.setFromCamera(mouse, this.camera);
        return this.raycaster.ray.clone();
    }

    private event_OnPointerDown(event: PointerEvent) {
        if (!this.dragHandler) return;
        const elements = this.getIntersectsElements(event);
        const element = this.getCardInHandFromInterseptions(elements)?.object ?? elements[0]?.object;
        this.dragHandler.onPointerDown(event, element?.uiElementRef ?? null);
    }

    /** A drag took over the pointer: whatever was hovered is left. */
    public leaveHover(event: MouseEvent) {
        this.hoverElement?.onMouseLeave?.(event);
        this.hoverElement = null;
    }

    public onDestroy(): void {

    }

    public registerElement(element: YGOUiElement) {
        (element.gameObject as UiObject).uiElementRef = element;
        element.isUiElement = true;
        this.elements.add(element);
    }

    public unregisterElement(element: YGOUiElement) {
        delete (element.gameObject as UiObject).uiElementRef;
        this.elements.delete(element);
    }

    private getElements(): THREE.Object3D[] {
        return Array.from(this.elements).map(e => e.gameObject).filter(e => e.visible);
    }

    private getIntersectsElements(event: MouseEvent): UiIntersection[] {
        const mouse = new THREE.Vector2();
        const activeElements = this.getElements();

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.mousePositionOnScreen.copy(mouse);

        this.raycaster.setFromCamera(mouse, this.camera);
        const intersects = this.raycaster.intersectObjects<UiObject>(activeElements);
        return intersects.filter((intersect) => intersect?.object?.uiElementRef);
    }

    private event_OnMouseDown(event: MouseEvent) {
        const elements = this.getIntersectsElements(event);
        const elementCardInHand = this.getCardInHandFromInterseptions(elements);
        if (elements.length > 0) {
            const element = elementCardInHand?.object || elements[0].object;
            this.mouseDownElement = element;

            const clickElement = element.uiElementRef as YGOUiElement;

            if (clickElement.onMouseDown) {
                clickElement.onMouseDown(event);
            }
        } else {
            this.mouseDownElement = null;
        }
    }

    private event_OnMouseUp(event: MouseEvent) {
        const elements = this.getIntersectsElements(event);
        const elementCardInHand = this.getCardInHandFromInterseptions(elements);

        if (elements.length > 0) {
            const element = elementCardInHand?.object || elements[0].object;

            (event as MouseEvent & { sameTargetAsMouseDown?: boolean }).sameTargetAsMouseDown = this.mouseDownElement === element;

            const clickElement = element.uiElementRef as YGOUiElement;

            if (clickElement.onMouseUp) {
                clickElement.onMouseUp(event);
            }
        }
    }

    private event_OnMouseClick(event: MouseEvent) {
        // The click a drag ends with: the drop already happened.
        if (this.dragHandler?.consumeClick()) {
            this.mouseDownElement = null;
            return;
        }
        const elements = this.getIntersectsElements(event);
        const elementCardInHand = this.getCardInHandFromInterseptions(elements);

        let clickElement: YGOUiElement | null = null;

        if (elements.length > 0) {
            const element = elementCardInHand?.object || elements[0].object;

            if (element === this.mouseDownElement) {
                clickElement = element.uiElementRef as YGOUiElement;

                if (clickElement.onMouseClick) {
                    clickElement.onMouseClick(event);
                }
            }
        }

        if (isClickHandled(event)) {
            // e.g. a double-click picked a card for an effect: an active field selection must not take it as a click away.
        } else if (this.onClickCb) {
            this.onClickCb({ event, elements });
        } else {
            this.events.dispatch("click", { event, elements });
        }

        this.mouseDownElement = null;
    }

    private event_OnMouseMove(event: MouseEvent) {
        if (this.dragHandler?.isDragging()) return;
        const elements = this.getIntersectsElements(event);
        const elementCardInHand = this.getCardInHandFromInterseptions(elements);

        if (elements.length > 0) {
            const element = elementCardInHand?.object || elements[0].object;
            const hoverElement = element.uiElementRef as YGOUiElement;

            if (hoverElement !== this.hoverElement) {
                if (this.hoverElement?.onMouseLeave) {
                    this.hoverElement.onMouseLeave(event);
                }

                this.hoverElement = hoverElement;

                if (this.hoverElement?.onMouseEnter) {
                    this.hoverElement.onMouseEnter(event);
                }
            }

        } else if (this.hoverElement) {

            if (this.hoverElement?.onMouseLeave) {
                this.hoverElement.onMouseLeave(event);
            }

            this.hoverElement = null;
        }
    }

    private getCardInHandFromInterseptions(elements: UiIntersection[]): UiIntersection | undefined {

        const gameHandZone = elements.find(c => c.object.uiElementRef!.isGameHandZone && c.object.visible);

        if (gameHandZone) {
            return gameHandZone;
        }

        const cardsInHand = elements.filter((element) => element.object.uiElementRef?.isUiCardElement);

        if (cardsInHand.length > 0) {
            cardsInHand.sort((a, b) => {
                return b.object.uiElementRef!.handIndex! - a.object.uiElementRef!.handIndex!;
            });

            return cardsInHand[0];
        }

        return undefined;
    }
}