import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { YgoDuelApp } from "../ui/YgoDuelApp";
import { YGOEndGameAction, YGOPlayerConnectToServerProps, YGOPlayerStartEditorProps, YGOPlayerStartReplayProps } from "../types";
import { Command, YGOClientType, YGOReplayData } from "ygo-core";
import { replayPropsToConfig, serverPropsToConfig } from "./component-config";
import { YGOConfig } from "../core/YGOConfig";
import { YGODuel } from "../core/YGODuel";
import { EventBus } from "../scripts/event-bus";
import { YGOClient } from "ygo-core";
import { LocalYGOPlayerClient } from "../network/local-server/local-client";
import { LocalYGOPlayerServer } from "../network/local-server/local-server";
import type { PuzzleRetryRequest } from "../ui/puzzle/puzzle-state";
import { clearDebugGlobal, exposeDebugGlobal } from "./debug-global";

export interface YGOPlayerComponentEvents {
  init: (args: { instance: YGOPlayerComponent; duel: YGODuel }) => void;
  start: (args: { instance: YGOPlayerComponent; duel: YGODuel }) => void;
  "command-created": (args: { command: Command }) => void;
  "command-executed": (args: { command: Command }) => void;
  "game-defeat": (args: { player: number }) => void;
  /** A next-step button on the end-of-duel overlay was clicked. Only fires
   * for actions the host enabled via `endGameActions`. `replay` is the
   * finished duel's replay data (null if it couldn't be built). */
  "end-game-action": (args: { action: YGOEndGameAction; loser: number; replay: YGOReplayData | null }) => void;
  /** Engine-checked puzzles: the player asked to try the puzzle again. A
   * retry is a new server room (ygo-socket-server puzzle:retry { roomId }),
   * so the host starts it and mounts the new duel. */
  "puzzle-retry": (args: PuzzleRetryRequest) => void;
}

type EventArgs<K extends keyof YGOPlayerComponentEvents> = Parameters<YGOPlayerComponentEvents[K]>[0];

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
  private root: Root | undefined;
  public client!: YGOClient;
  public duel!: YGODuel;
  public server: LocalYGOPlayerServer | undefined;
  private events: EventBus<YGOPlayerComponentEvents>;
  // Stashed here (rather than threaded through YGOConfig) since it's only
  // ever relevant for connectToServer — editor/replay have no judge/adapter
  // to query at all — and handed to `duel` once bind() actually has one.
  private assist?: YGOPlayerConnectToServerProps["assist"];

  constructor() {
    super();
    this.events = new EventBus();

    // Devtools handle, opt-in only (see debug-global.ts).
    exposeDebugGlobal(window, this);
  }

  connectedCallback() {
    //const shadowRoot = this.attachShadow({ mode: 'open' });
    //shadowRoot.appendChild(container);

    const container = document.createElement("div");
    this.appendChild(container);
    container.style.width = "100%";
    container.style.height = "100%";

    this.root = createRoot(container); // Create a root for React 18
  }

  disconnectedCallback() {
    this.destroy();
  }

  private bind(duel: YGODuel) {
    this.duel = duel;
    duel.assist = this.assist;

    this.duel.ygo.events.on("command-created", (data) => {
      this.dispatch("command-created", data);
    });
    this.duel.ygo.events.on("command-executed", (data) => {
      this.dispatch("command-executed", data);
    });


    // Listen for game-defeat events from the duel and dispatch them to the web interface
    this.duel.events.on("game-defeat", (data: EventArgs<"game-defeat">) => {
      this.dispatch("game-defeat", data);
    });

    this.duel.events.on("end-game-action", (data: EventArgs<"end-game-action">) => {
      this.dispatch("end-game-action", data);
    });

    this.duel.events.on("puzzle-retry", (data: EventArgs<"puzzle-retry">) => {
      this.dispatch("puzzle-retry", data);
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
        client: this.client,
        config,
      })
    );
  }

  editor(props: YGOPlayerStartEditorProps) {

    const client = new LocalYGOPlayerClient(props.players[0]?.name || "Player 1", YGOClientType.PLAYER);
    this.client = client;

    const config: YGOConfig = {
      cdnUrl: props.cdnUrl,
      commands: props.commands,
      players: props.players,
      options: props.options,
      actions: props.actions,
      gameMode: props.gameMode || "EDITOR",
      endGameActions: props.endGameActions,
      onError: props.onError,
    };

    this.server = new LocalYGOPlayerServer(client, config);

    this.start(config);
  }

  replay(props: YGOPlayerStartReplayProps) {
    const config = replayPropsToConfig(props);
    const client = new LocalYGOPlayerClient(config.players[0]?.name || "Player 1", YGOClientType.PLAYER);
    this.client = client;
    this.server = new LocalYGOPlayerServer(client, config);

    this.start(config);
  }

  connectToServer(props: YGOPlayerConnectToServerProps): void {

    this.client = props.client;
    this.assist = props.assist;

    const config = serverPropsToConfig(props);

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

    if (typeof window !== "undefined") {
      clearDebugGlobal(window, this);
    }
  }
}
