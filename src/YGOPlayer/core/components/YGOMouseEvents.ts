import * as THREE from 'three';
import { YGOComponent } from "../YGOComponent";
import { YGODuel } from "../YGODuel";
import { YGOUiElement } from '../../types';
import { EventBus } from '../../scripts/event-bus';

export class YGOMouseEvents extends YGOComponent {
    private elements: Set<YGOUiElement>;
    private camera: THREE.Camera;
    private raycaster: THREE.Raycaster;
    private mouseDownElement: YGOUiElement | null;
    private hoverElement: YGOUiElement | null;
    public events: EventBus<any>;

    public onClickCb: any;
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
    }

    public onDestroy(): void {

    }

    public registerElement(element: any) {
        element.gameObject.uiElementRef = element;
        element.isUiElement = true;
        this.elements.add(element);
    }

    public unregisterElement(element: any) {
        delete element.gameObject.uiElementRef;
        this.elements.delete(element);
    }

    private getElements(): THREE.Object3D[] {
        return Array.from(this.elements).map(e => e.gameObject);

        // const activeElements = [];
        // for (const element of this.elements) {
        //     if (element.enabled) {
        //         activeElements.push(element);
        //     }
        // }
        // return activeElements;
    }

    private getIntersectsElements(event: MouseEvent) {
        const mouse = new THREE.Vector2();
        const activeElements = this.getElements();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(activeElements);
        return intersects;
    }

    private event_OnMouseDown(event: MouseEvent) {
        const elements = this.getIntersectsElements(event);
        const elementCardInHand = this.getCardInHandFromInterseptions(elements);

        if (elements.length > 0) {
            const element: any = elementCardInHand?.object || elements[0].object;
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
            const element: any = elementCardInHand?.object || elements[0].object;

            (event as any).sameTargetAsMouseDown = this.mouseDownElement === element;

            const clickElement = element.uiElementRef as YGOUiElement;

            if (clickElement.onMouseUp) {
                clickElement.onMouseUp(event);
            }
        }
    }

    private event_OnMouseClick(event: MouseEvent) {
        const elements = this.getIntersectsElements(event);
        const elementCardInHand = this.getCardInHandFromInterseptions(elements);

        let clickElement: YGOUiElement | null = null;

        if (elements.length > 0) {
            const element: any = elementCardInHand?.object || elements[0].object;

            if (element === this.mouseDownElement) {
                clickElement = element.uiElementRef as YGOUiElement;

                if (clickElement.onMouseClick) {
                    clickElement.onMouseClick(event);
                }
            }
        }

        if (this.onClickCb) {
            this.onClickCb({ event, elements });
        } else {
            this.events.dispatch("click", { event, elements });
        }

        this.mouseDownElement = null;
    }

    private event_OnMouseMove(event: MouseEvent) {
        const elements = this.getIntersectsElements(event);
        const elementCardInHand = this.getCardInHandFromInterseptions(elements);

        if (elements.length > 0) {
            const element: any = elementCardInHand?.object || elements[0].object;
            const hoverElement: YGOUiElement = element.uiElementRef;

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

    private getCardInHandFromInterseptions(elements: any[]) {
        const cardsInHand = elements.filter((element) => element.object.uiElementRef?.isUiCardElement);

        if (cardsInHand.length > 0) {
            cardsInHand.sort((a: any, b: any) => {
                return b.object.uiElementRef.handIndex - a.object.uiElementRef.handIndex;
            });

            return cardsInHand[0];
        }

        return undefined;
    }
}