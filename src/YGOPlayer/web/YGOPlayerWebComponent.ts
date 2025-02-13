import { createElement } from 'react';
import ReactDOM from 'react-dom/client';  // Use the new 'react-dom/client' package for React 18
import { YgoDuelApp } from '../ui/YgoDuelApp';
import { YGOPlayerStartEditorProps, YGOPlayerStartReplayProps } from '../types';
import { CardData, YGOProps } from '../../YGOCore/types/types';
import { YGOConfig } from '../core/YGOConfig';

export class YGOPlayerComponent extends HTMLElement {
    private root: ReactDOM.Root | undefined;

    constructor() {
        super();
    }

    connectedCallback() {
        //const shadowRoot = this.attachShadow({ mode: 'open' });
        const container = document.createElement('div');
        //shadowRoot.appendChild(container);
        this.appendChild(container);
        container.style.width = "100%";
        container.style.height = "100%";

        this.root = ReactDOM.createRoot(container); // Create a root for React 18
    }

    on(event: string, callback: () => void) {

    }

    off(event: string, callback: () => void) {

    }

    editor(props: YGOPlayerStartEditorProps) {
        const config = {
            cdnUrl: props.cdnUrl,
            players: props.players,
            options: props.options
        }

        this.start(config);
    }

    replay(props: YGOPlayerStartReplayProps) {
        const players = props.replay.players.map((playerData, playerIndex) => {
            const mainDeck: CardData[] = playerData.mainDeck.map(id => {
                const card = props.decks[playerIndex].mainDeck.find(card => card.id === id);
                if (!card) throw new Error(`Card "${id}" not found in main deck of player "${playerData.name}"`);
                return card as CardData;
            });

            const extraDeck: CardData[] = playerData.extraDeck.map(id => {
                const card = props.decks[playerIndex].extraDeck.find(card => card.id === id);
                if (!card) throw new Error(`Card "${id}" not found in extra deck of player "${playerData.name}"`);
                return card as CardData;
            });

            return {
                name: playerData.name,
                mainDeck,
                extraDeck
            }
        })
        const config = {
            players,
            commands: props.replay.commands,
            options: props.options || {},
            cdnUrl: props.cdnUrl,
        }

        config.options.shuffleDecks = false;
        
        this.start(config);
    }

    private start(config: YGOConfig) {
        if (!this.root) throw new Error("There is no root to render");

        const dispatch = () => {

        }

        this.root.render(createElement(YgoDuelApp, { config }));
    }
}