import { YGOPlayerComponent, YGOPlayerComponentEvents, YGOPlayerComponentImpl } from "./YGOPlayerWebComponent";

function registerYGOWebComponents() {
    if (typeof window === "undefined") return;

    if (!customElements.get("ygo-player")) {
        customElements.define('ygo-player', YGOPlayerComponentImpl);
    }
}

export {
    registerYGOWebComponents,
}

export type {
    YGOPlayerComponent,
    YGOPlayerComponentEvents,
}
