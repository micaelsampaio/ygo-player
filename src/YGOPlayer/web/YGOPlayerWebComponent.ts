import { createElement } from "react";
import ReactDOM from "react-dom/client";
import { YgoDuelApp } from "../ui/YgoDuelApp";
import { YGOPlayerStartEditorProps, YGOPlayerStartReplayProps } from "../types";
import { CardData, Command } from "ygo-core";
import { YGOConfig } from "../core/YGOConfig";
import { YGODuel } from "../core/YGODuel";
import { EventBus } from "../scripts/event-bus";

export interface YGOPlayerComponentEvents {
  init: (args: { instance: YGOPlayerComponent; duel: YGODuel }) => void;
  start: (args: { instance: YGOPlayerComponent; duel: YGODuel }) => void;
  "command-created": (args: { command: Command }) => void;
  "command-executed": (args: { command: Command }) => void;
}

export class YGOPlayerComponent extends HTMLElement {
  private root: ReactDOM.Root | undefined;
  public duel!: YGODuel;
  private events: EventBus<YGOPlayerComponentEvents>;

  constructor() {
    super();
    this.events = new EventBus();
  }

  connectedCallback() {
    //const shadowRoot = this.attachShadow({ mode: 'open' });
    //shadowRoot.appendChild(container);

    const container = document.createElement("div");
    this.appendChild(container);
    container.style.width = "100%";
    container.style.height = "100%";

    this.root = ReactDOM.createRoot(container); // Create a root for React 18
  }

  disconnectedCallback() {
    this.destroy();
  }

  private bind(duel: YGODuel) {
    this.duel = duel;

    this.duel.ygo.events.on("command-created", (data: any) => {
      this.dispatch("command-created", data);
    });
    this.duel.ygo.events.on("command-executed", (data: any) => {
      this.dispatch("command-executed", data);
    });


    this.dispatch("init", { instance: this, duel });
  }

  private start(config: YGOConfig) {
    if (!this.root) throw new Error("There is no root to render");

    this.root.render(
      createElement(YgoDuelApp, {
        bind: this.bind.bind(this),
        start: (duel) => {
          this.dispatch("start", { instance: this, duel })
        },
        config,
      })
    );
  }

  editor(props: YGOPlayerStartEditorProps) {
    const config = {
      cdnUrl: props.cdnUrl,
      commands: props.commands,
      players: props.players,
      options: props.options,
      actions: props.actions,
    };
    console.log("------- CONFIG ------");
    console.log(config);
    this.start(config);
  }

  replay(props: YGOPlayerStartReplayProps) {
    const players = props.replay.players.map(
      (playerData: any, playerIndex: any) => {
        const mainDeck: CardData[] = playerData.mainDeck.map((id: any) => {
          const card = props.decks[playerIndex].mainDeck.find(
            (card) => card.id === id
          );
          if (!card)
            throw new Error(
              `Card "${id}" not found in main deck of player "${playerData.name}"`
            );
          return card as CardData;
        });

        const extraDeck: CardData[] = playerData.extraDeck.map((id: any) => {
          const card = props.decks[playerIndex].extraDeck.find(
            (card) => card.id === id
          );
          if (!card)
            throw new Error(
              `Card "${id}" not found in extra deck of player "${playerData.name}"`
            );
          return card as CardData;
        });

        return {
          name: playerData.name,
          mainDeck,
          extraDeck,
        };
      }
    );
    const config = {
      players,
      commands: props.replay.commands,
      options: props.options || {},
      cdnUrl: props.cdnUrl,
      actions: props.actions,
    };

    config.options.shuffleDecks = false;

    console.log("------- CONFIG ---------");
    console.log(JSON.stringify(config));

    this.start(config);
  }

  on<K extends keyof YGOPlayerComponentEvents>(
    event: K,
    listener: YGOPlayerComponentEvents[K]
  ): void {
    this.events.on(event, listener);
  }

  off<K extends keyof YGOPlayerComponentEvents>(
    event: K,
    listener: YGOPlayerComponentEvents[K]
  ): void {
    this.events.off(event, listener);
  }

  dispatch<K extends keyof YGOPlayerComponentEvents>(
    event: K,
    ...args: Parameters<YGOPlayerComponentEvents[K]>
  ): void {
    this.events.dispatch(event, ...args);
  }

  destroy() {
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }

    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
  }
}
