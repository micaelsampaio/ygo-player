
export class YGOPlayerComponent2 extends HTMLElement {

    constructor() {
        super();
    }

    connectedCallback() {

        const container = document.createElement('div');
        container.innerHTML = "TODO TODO";
        this.appendChild(container);
        container.style.width = "100%";
        container.style.height = "100%";
    }

    on(event: string, callback: () => void) {

    }

    off(event: string, callback: () => void) {

    }

    editor() {

    }

    replay() {

    }

    private start() {

    }
}

if (!customElements.get("ygo-player2")) {
    customElements.define('ygo-player2', YGOPlayerComponent2);
}
