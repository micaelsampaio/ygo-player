import * as THREE from "three";
import { YGOComponent } from "../YGOComponent";
import { YGODuel } from "../YGODuel";
import { Card } from "ygo-core";
import { ActionCardZoneMenu } from "../../actions/ActionCardZoneMenu";
import { ActionCardHandMenu } from "../../actions/ActionCardHandMenu";

export class YGOLongPressHandler extends YGOComponent {
  private duel: YGODuel;
  private isLongPressing: boolean = false;
  private longPressTimer: number | null = null;
  private longPressThreshold: number = 500; // ms
  private currentCardInfo: {
    card: Card;
    position: THREE.Vector3;
    uiElement: any;
    mouseEvent: MouseEvent | Touch;
  } | null = null;
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private progressInterval: number | null = null;
  private progress: number = 0;
  public isStarted: boolean = false;
  private shortPressAllowed: boolean = true;

  constructor(duel: YGODuel) {
    super("long_press_handler");
    this.duel = duel;
    console.log("YGOLongPressHandler initialized");
  }

  public start(): void {
    if (this.isStarted) return;
    this.isStarted = true;

    console.log("YGOLongPressHandler started - adding event listeners");

    // Use bind to create bound function references that we can later remove
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);

    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mouseup", this.onMouseUp);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("touchstart", this.onTouchStart, {
      passive: false,
    });
    document.addEventListener("touchend", this.onTouchEnd);
    document.addEventListener("touchmove", this.onTouchMove, {
      passive: false,
    });
  }

  public onDestroy(): void {
    console.log(
      "YGOLongPressHandler being destroyed - removing event listeners"
    );
    document.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mouseup", this.onMouseUp);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("touchstart", this.onTouchStart);
    document.removeEventListener("touchend", this.onTouchEnd);
    document.removeEventListener("touchmove", this.onTouchMove);
    this.clearLongPressTimer();
  }

  private onMouseDown(event: MouseEvent): void {
    this.mousePosition = { x: event.clientX, y: event.clientY };
    this.shortPressAllowed = true;
    console.log("Mouse down at", this.mousePosition);
    this.startLongPress(event);
  }

  private onMouseUp(event: MouseEvent): void {
    console.log("Mouse up");

    // Handle short press (tap) only if we haven't triggered long press yet
    if (this.currentCardInfo && this.shortPressAllowed) {
      this.handleShortPress(this.currentCardInfo, event);
    }

    // Clear the timer but don't end the long press if it's active
    this.clearLongPressTimer();

    // Don't hide the progress indicator or end long press state
    // if we've already triggered the long press, to keep modal open
    if (!this.isLongPressing) {
      this.hideProgressIndicator();
    }

    // Only clear currentCardInfo if we're not in long press state
    // This ensures the card reference stays available for future actions
    if (!this.isLongPressing) {
      this.currentCardInfo = null;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (
      this.currentCardInfo &&
      (Math.abs(event.clientX - this.mousePosition.x) > 10 ||
        Math.abs(event.clientY - this.mousePosition.y) > 10)
    ) {
      if (this.longPressTimer) {
        console.log("Mouse moved too much, canceling long press");
        this.hideProgressIndicator();
        this.shortPressAllowed = false; // Too much movement, don't trigger short press either
      }
      this.clearLongPressTimer();
    }
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.mousePosition = { x: touch.clientX, y: touch.clientY };
      this.shortPressAllowed = true;
      console.log("Touch start at", this.mousePosition);
      this.startLongPress(touch);
      event.preventDefault(); // Prevent screen from scrolling during potential long press
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    console.log("Touch end");

    // Handle short press (tap) if we haven't triggered long press yet
    if (this.currentCardInfo && this.shortPressAllowed) {
      // Convert the last touch to a mock mouse event for compatibility
      const mockEvent = {
        clientX: this.mousePosition.x,
        clientY: this.mousePosition.y,
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as MouseEvent;

      this.handleShortPress(this.currentCardInfo, mockEvent);
    }

    // Clear the timer but don't end the long press if it's active
    this.clearLongPressTimer();

    // Don't hide the progress indicator or end long press state
    // if we've already triggered the long press, to keep modal open
    if (!this.isLongPressing) {
      this.hideProgressIndicator();
    }

    // Only clear currentCardInfo if we're not in long press state
    if (!this.isLongPressing) {
      this.currentCardInfo = null;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      if (
        Math.abs(touch.clientX - this.mousePosition.x) > 10 ||
        Math.abs(touch.clientY - this.mousePosition.y) > 10
      ) {
        if (this.longPressTimer) {
          console.log("Touch moved too much, canceling long press");
          this.hideProgressIndicator();
          this.shortPressAllowed = false; // Too much movement, don't trigger short press either
        }
        this.clearLongPressTimer();
      }
      // Only prevent default if we're potentially doing a long press
      if (this.longPressTimer !== null) {
        event.preventDefault();
      }
    }
  }

  private startLongPress(event: MouseEvent | Touch): void {
    this.clearLongPressTimer();
    this.progress = 0;

    console.log("Starting long press check");

    const elements = this.getElementsAtPosition(event);
    if (!elements || elements.length === 0) {
      console.log("No elements found at position");
      return;
    }

    console.log(`Found ${elements.length} intersecting elements`);

    // Get the first intersection
    const element = elements[0];
    // Check if this object has a userData property with uiElementRef
    const object = element.object;

    console.log("Object userData:", object.userData);

    if (!object || !object.userData) {
      console.log("No userData found on object");
      return;
    }

    // Get the UI element reference from userData
    const uiElementRef = object.userData.uiElementRef;

    if (!uiElementRef) {
      console.log("No uiElementRef found in userData");
      return;
    }

    console.log("Found uiElementRef:", uiElementRef);
    console.log("isUiCardElement:", uiElementRef.isUiCardElement);
    console.log("Has card:", !!uiElementRef.card);

    // Check if this is a card element with a card property
    if (
      uiElementRef &&
      (uiElementRef.isUiCardElement || uiElementRef.getCardReference) &&
      (uiElementRef.card || uiElementRef.getCardReference())
    ) {
      // Store card info for later use in short press or long press
      const card = uiElementRef.card || uiElementRef.getCardReference();
      console.log("Long press starting on card:", card.name);

      this.currentCardInfo = {
        card: card,
        position: uiElementRef.position
          ? uiElementRef.position.clone()
          : new THREE.Vector3(),
        uiElement: uiElementRef,
        mouseEvent: event as MouseEvent, // Cast to MouseEvent for simplicity
      };

      // Show progress indicator
      this.showProgressIndicator();

      // Start progress update interval
      this.progressInterval = window.setInterval(() => {
        this.progress = Math.min(this.progress + 0.05, 1);
        this.updateProgressIndicator();

        if (this.progress >= 1) {
          clearInterval(this.progressInterval!);
          this.progressInterval = null;
        }
      }, this.longPressThreshold / 20);

      // Start the actual long press timer
      this.longPressTimer = window.setTimeout(() => {
        console.log("Long press timer triggered for:", card.name);
        this.isLongPressing = true;
        this.shortPressAllowed = false; // Prevent short press from also triggering

        // Complete progress indicator first
        this.completeProgressIndicator();

        // Short delay before hiding the indicator and showing the preview
        setTimeout(() => {
          // Hide the progress indicator after it completes
          this.hideProgressIndicator();

          // Dispatch event with card and mouse position
          console.log("Dispatching show-card-preview event");
          this.duel.events.dispatch("show-card-preview", {
            card: card,
            position: this.mousePosition,
          });

          console.log(
            "Long press activated: showing card preview for",
            card.name
          );
        }, 300); // Small delay to allow animation to complete
      }, this.longPressThreshold);
    } else {
      console.log("Element is not a valid card element for long press");
    }
  }

  private handleShortPress(
    cardInfo: NonNullable<typeof this.currentCardInfo>,
    event: MouseEvent
  ): void {
    console.log("Short press (tap) detected, opening card menu");

    const uiElement = cardInfo.uiElement;
    const card = cardInfo.card;

    // Handle auto change player if needed
    if (this.duel.config.autoChangePlayer && uiElement.player !== undefined) {
      this.duel.setActivePlayer(uiElement.player);
    }

    // Determine what kind of menu to open based on the element type
    if (uiElement.handIndex !== undefined) {
      // This is a card in hand
      const action =
        this.duel.actionManager.getAction<ActionCardHandMenu>("card-hand-menu");
      action.setData({
        duel: this.duel,
        card: card,
        cardInHand: uiElement,
        index: uiElement.handIndex,
        mouseEvent: event,
      });
      this.duel.actionManager.setAction(action);
    } else if (uiElement.zone !== undefined) {
      // This is a card in a zone
      const action =
        this.duel.actionManager.getAction<ActionCardZoneMenu>("card-zone-menu");
      action.setData({
        duel: this.duel,
        gameCard: uiElement.card || uiElement.getGameCard(),
        card: card,
        zone: uiElement.zone,
        mouseEvent: event,
      });
      this.duel.actionManager.setAction(action);
    } else {
      console.log("Unknown element type, can't open appropriate menu");
    }
  }

  private endLongPress(): void {
    this.isLongPressing = false;

    // Hide the progress indicator
    this.hideProgressIndicator();

    console.log("Dispatching hide-card-preview event");
    this.duel.events.dispatch("hide-card-preview");
    console.log("Long press ended: hiding card preview");
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (this.progressInterval !== null) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    this.progress = 0;
  }

  private showProgressIndicator(): void {
    // Show progress indicator UI at mouse position
    this.duel.events.dispatch("show-long-press-indicator", {
      position: this.mousePosition,
      progress: 0,
    });
  }

  private updateProgressIndicator(): void {
    // Update progress indicator UI
    this.duel.events.dispatch("update-long-press-indicator", {
      progress: this.progress,
    });
  }

  private completeProgressIndicator(): void {
    // Complete progress indicator UI
    this.duel.events.dispatch("complete-long-press-indicator");
  }

  private hideProgressIndicator(): void {
    // Hide progress indicator UI
    this.duel.events.dispatch("hide-long-press-indicator");
  }

  private getElementsAtPosition(
    event: MouseEvent | Touch
  ): THREE.Intersection[] | null {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, this.duel.camera);

    // Debug scene children
    console.log("Total scene children:", this.duel.core.scene.children.length);

    // Get all objects from the scene to check for intersections
    const allObjects = this.duel.core.scene.children;

    // Log some stats about objects in the scene
    const objectsWithUserData = allObjects.filter((obj) => obj.userData);
    const objectsWithUiElementRef = objectsWithUserData.filter(
      (obj) => obj.userData.uiElementRef
    );

    console.log("Objects with userData:", objectsWithUserData.length);
    console.log("Objects with uiElementRef:", objectsWithUiElementRef.length);

    // Find interactive objects (cards)
    const interactiveObjects = allObjects.filter((obj) => {
      return (
        obj.userData &&
        obj.userData.uiElementRef &&
        obj.userData.uiElementRef.isUiCardElement
      );
    });

    console.log("Interactive card objects found:", interactiveObjects.length);

    if (interactiveObjects.length === 0) {
      console.log("No interactive objects found in scene");
      return null;
    }

    const intersections = raycaster.intersectObjects(interactiveObjects, true);
    console.log("Intersections found:", intersections.length);
    return intersections.length > 0 ? intersections : null;
  }
}
