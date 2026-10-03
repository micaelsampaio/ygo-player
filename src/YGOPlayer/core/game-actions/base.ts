import { YGOClientType } from "ygo-core";
import { ASSIST_FREE_FORM_NOTICE, AssistMove, assistRouteFor } from "../../domain/assist-routing";
import type { CardRefData } from "../../domain/assist-prompt";
import { Card, FieldZone } from "ygo-core";
import { ActionCardSelection } from "../../actions/ActionSelectCard";
import { CardZone } from "../../game/CardZone";
import { YGODuel } from "../YGODuel";

/**
 * YGOGameActions, split by action family: this base holds what every family
 * uses (the duel, the zone/card picker, the Assisted Mode router and the
 * exec helpers); SummonActions, CardActions and DuelActions add the
 * commands on top, and YGOGameActions is the last of the chain.
 */
export class GameActionsBase {
  protected duel: YGODuel;
  protected cardSelection: ActionCardSelection;

  constructor(duel: YGODuel) {
    this.duel = duel;
    this.cardSelection =
      this.duel.gameController.getComponent<ActionCardSelection>(
        "action_card_selection"
      );
  }

  protected clearAction() {
    this.duel.events.dispatch("clear-ui-action");
  }

  public setSelectedCard({ card, force = false, player }: { card: Card | null, force?: boolean, player?: number }) {
    if (!force) {
      const position = card?.position ?? null;
      const owner = card?.originalOwner ?? -1;
      const showCards = Number.isInteger(player) ? this.duel.fields[player!].settings.showCards : true;

      if (!showCards && owner >= 0) {

        if (!this.duel.perspective.isPlayerPOV(owner) && position && position.includes("facedown")) {
          return;
        }
      }
    }

    this.duel.events.dispatch("set-selected-card", { card, player });
  }

  /**
   * Assisted Mode: when the engine currently offers this exact move for this
   * card, make it through the engine (duel.assist.choose) — the engine runs
   * the effect and the panel then shows its prompts for the human to answer.
   * Returns true when it did. Otherwise (no match) the caller falls back to
   * the free-form move, with a short notice that the engine can't follow it.
   */
  protected routeAssisted(move: AssistMove, card: Card, originZone: FieldZone | undefined): boolean {
    const duel = this.duel;
    const assist = duel.assist;
    if (!assist || duel.client?.type !== YGOClientType.PLAYER || !duel.ygo?.options?.assistedMode) return false;
    const controller = duel.assistController;
    const route = assistRouteFor(controller.options, move, card.id, originZone);
    if (route.kind === "freeForm") {
      duel.events.dispatch("assist-notice", { message: ASSIST_FREE_FORM_NOTICE });
      return false;
    }
    this.clearAction();
    if (route.kind === "blocked") {
      duel.events.dispatch("assist-notice", { message: route.message });
      return true;
    }
    const choose = (ref: CardRefData) => controller.choose({ commandType: move, data: { id: ref.code, ctrl: ref.ctrl, loc: ref.loc, seq: ref.seq } });
    duel.events.dispatch("assist-choice-start", { code: card.id });
    const done = route.kind === "choose"
      ? choose(route.ref)
      // Continue past the open window, then make the move if the engine now lists it.
      : controller.choose({ commandType: "Pass", data: {} })
        .then(() => controller.query())
        .then((next: any) => {
          const again = assistRouteFor(next, move, card.id, originZone);
          if (again.kind === "choose") return choose(again.ref);
          return { notices: [`${card.name ?? "That card"} can't do that right now.`] };
        });
    done
      .then((res: any) => duel.events.dispatch("assist-choice-done", { notices: res?.notices }))
      .catch((error: any) => duel.events.dispatch("assist-choice-done", { error }));
    return true;
  }

  /**
   * Clear the pending UI action, have the player pick one of `getZones()`,
   * then exec the command `build` makes for that zone.
   */
  protected selectZoneThen(
    getZones: () => CardZone[],
    build: (zone: FieldZone, player: number) => any,
    { skipIfNoZones = false }: { skipIfNoZones?: boolean } = {}
  ) {
    this.clearAction();
    const player = this.duel.serverActions.getActivePlayer();
    const zones = getZones();
    if (skipIfNoZones && zones.length === 0) return;

    this.cardSelection.startSelection({
      zones,
      selectionType: "zone",
      onSelectionCompleted: (cardZone: CardZone) => {
        this.duel.execCommand(build(cardZone.zone, player));
      },
    });
  }

  /**
   * One-shot command on `card` ({ player, id, ...extra }). `clear` says
   * whether the pending UI action is cleared first: banish, flip,
   * changeBattlePosition, toDeck and disapear leave it as is.
   */
  protected execOnCard(
    CommandClass: new (data: any) => any,
    { card, player, ...extra }: { card: Card; player?: number; [key: string]: any },
    { clear = true }: { clear?: boolean } = {}
  ) {
    if (clear) this.clearAction();
    this.duel.execCommand(
      new CommandClass({
        player: player ?? this.duel.serverActions.getActivePlayer(),
        id: card.id,
        ...extra,
      })
    );
  }
}
