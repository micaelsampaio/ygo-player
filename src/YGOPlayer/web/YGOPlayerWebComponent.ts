import { createElement } from "react";
import ReactDOM from "react-dom/client";
import { YgoDuelApp } from "../ui/YgoDuelApp";
import { YGOPlayerConnectToServerProps, YGOPlayerStartEditorProps, YGOPlayerStartReplayProps } from "../types";
import { CardData, Command, YGOClientType } from "ygo-core";
import { YGOConfig } from "../core/YGOConfig";
import { YGODuel } from "../core/YGODuel";
import { EventBus } from "../scripts/event-bus";
import { YGOPropsOptions } from "ygo-core";
import { YGOClient } from "ygo-core";
import { LocalYGOPlayerClient } from "../network/local-server/local-client";
import { LocalYGOPlayerServer } from "../network/local-server/local-server";

export interface YGOPlayerComponentEvents {
  init: (args: { instance: YGOPlayerComponent; duel: YGODuel }) => void;
  start: (args: { instance: YGOPlayerComponent; duel: YGODuel }) => void;
  "command-created": (args: { command: Command }) => void;
  "command-executed": (args: { command: Command }) => void;
}

export interface YGOPlayerComponent extends HTMLElement {
  editor(props: YGOPlayerStartEditorProps): void

  replay(props: YGOPlayerStartReplayProps): void

  connectToServer(args: YGOPlayerConnectToServerProps): void

  on<K extends keyof YGOPlayerComponentEvents>(
    event: K,
    listener: YGOPlayerComponentEvents[K]
  ): void

  off<K extends keyof YGOPlayerComponentEvents>(
    event: K,
    listener: YGOPlayerComponentEvents[K]
  ): void

  dispatch<K extends keyof YGOPlayerComponentEvents>(
    event: K,
    ...args: Parameters<YGOPlayerComponentEvents[K]>
  ): void

  destroy(): void
}

export class YGOPlayerComponentImpl extends HTMLElement implements YGOPlayerComponent {
  private root: ReactDOM.Root | undefined;
  public client!: YGOClient;
  public duel!: YGODuel;
  public server: any;
  private events: EventBus<YGOPlayerComponentEvents>;

  constructor() {
    super();
    this.events = new EventBus();

    if (window.location.href.startsWith("http://localhost")) {
      (window as any).YGO_WEB_COMPONENT = this;
    }
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

    console.log("TCL: YGO WEB COMPOENENT START: ", config);

    this.root.render(
      createElement(YgoDuelApp, {
        bind: this.bind.bind(this),
        start: (duel) => {
          this.dispatch("start", { instance: this, duel })
        },
        client: this.client,
        config,
      })
    );
  }

  editor(props: YGOPlayerStartEditorProps) {

    this.client = new LocalYGOPlayerClient(props.players[0]?.name || "Player 1", YGOClientType.PLAYER)

    const config: YGOConfig = {
      cdnUrl: props.cdnUrl,
      commands: props.commands,
      players: props.players,
      options: props.options,
      actions: props.actions,
      gameMode: props.gameMode || "EDITOR",
    };

    this.server = new LocalYGOPlayerServer(this.client, config);

    this.start(config);
  }

  replay(props: YGOPlayerStartReplayProps) {

    const options: YGOPropsOptions = {};

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

    options.fieldState = [
      ...props.replay.initialField || []
    ];

    const config: YGOConfig = {
      players,
      commands: props.replay.commands,
      options,
      cdnUrl: props.cdnUrl,
      actions: props.actions,
      gameMode: "REPLAY",
    };

    config.options.shuffleDecks = false;

    this.client = new LocalYGOPlayerClient(players[0]?.name || "Player 1", YGOClientType.PLAYER)
    this.server = new LocalYGOPlayerServer(this.client, config);

    this.start(config);
  }

  connectToServer(props: YGOPlayerConnectToServerProps): void {

    this.client = props.client;

    const config: YGOConfig = {
      players: [],
      commands: [],
      options: {},
      cdnUrl: props.cdnUrl,
      actions: {},
      gameMode: "EDITOR",
    };

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
