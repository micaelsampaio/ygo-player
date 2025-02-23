import { YGOPlayerComponent } from "./YGOPlayerWebComponent";

function registerWebComponents() {
    if (!customElements.get("ygo-player")) {
        customElements.define('ygo-player', YGOPlayerComponent);
    }
   
}

export {
    registerWebComponents,
    YGOPlayerComponent,

}

registerWebComponents();