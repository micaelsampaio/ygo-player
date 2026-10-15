import type { CardData, YGOPropsOptions } from "ygo-core";
import type { YGOConfig } from "../core/YGOConfig";
import type { YGOPlayerConnectToServerProps, YGOPlayerStartReplayProps } from "../types";

/**
 * The replay viewer's config (YGOPlayerComponent.replay): each player's
 * ordered deck ids resolved against the host's card data, the replay's
 * initial field as the field state, and no shuffling.
 */
export function replayPropsToConfig(props: YGOPlayerStartReplayProps): YGOConfig {
  const options: YGOPropsOptions = { ...props.options || {} };

  const players = props.replay.players.map((playerData, playerIndex) => {
    const resolve = (ids: number[], pile: "mainDeck" | "extraDeck", label: string): CardData[] =>
      ids.map((id) => {
        const card = props.decks[playerIndex][pile].find((card) => card.id === id);
        if (!card) throw new Error(`Card "${id}" not found in ${label} of player "${playerData.name}"`);
        return card as CardData;
      });

    return {
      name: playerData.name,
      mainDeck: resolve(playerData.mainDeck, "mainDeck", "main deck"),
      extraDeck: resolve(playerData.extraDeck, "extraDeck", "extra deck"),
    };
  });

  options.fieldState = [...props.replay.initialField || []];
  options.shuffleDecks = false;

  return {
    players,
    commands: props.replay.commands,
    options,
    cdnUrl: props.cdnUrl,
    actions: props.actions,
    gameMode: "REPLAY",
    endGameActions: props.endGameActions,
    onError: props.onError,
  };
}

/**
 * A server room's config (YGOPlayerComponent.connectToServer): the players,
 * commands and rules come from the server. Of the host's actions only
 * saveReplay, so the settings menu offers "Save Replay" only when given.
 */
export function serverPropsToConfig(props: YGOPlayerConnectToServerProps): YGOConfig {
  return {
    players: [],
    commands: [],
    options: {},
    cdnUrl: props.cdnUrl,
    actions: props.actions?.saveReplay ? { saveReplay: props.actions.saveReplay } : {},
    gameMode: "EDITOR",
    endGameActions: props.endGameActions,
    onError: props.onError,
  };
}
