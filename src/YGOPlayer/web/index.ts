import { YGOPlayerComponent } from "./YGOPlayerWebComponent";
import { YGOPlayerComponent2 } from "./YGOPlayerWebComponent2";

function registerWebComponents() {
    if (!customElements.get("ygo-player")) {
        customElements.define('ygo-player', YGOPlayerComponent);
    }
    if (!customElements.get("ygo-player2")) {
        customElements.define('ygo-player2', YGOPlayerComponent2);
    }
}

export {
    registerWebComponents,
    YGOPlayerComponent,
    YGOPlayerComponent2

}

registerWebComponents();