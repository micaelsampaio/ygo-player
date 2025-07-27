import { DuelEventHandlerProps } from "..";
import { YGODuelEvents } from "ygo-core";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";

interface DuelNotesEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.Note;
}

export class DuelNotesEventHandler extends YGOCommandHandler {
  private unsubscribeEscEvent?: () => void;
  private unsubscribeArrowRightEvent?: () => void;

  constructor(private props: DuelNotesEventHandlerProps) {
    super("notes_command_handler");
  }

  public start(): void {
    const { event, duel } = this.props;

    const eventType = "duel-notes-game-event-hanlder";

    const eventData = {
      duel: duel,
      event,
      onCompleted: () => {
        this.props.onCompleted()
      }
    }

    duel.events.dispatch("clear-ui-action");
    duel.events.dispatch("set-ui-menu", {
      group: "duel_notes",
      type: eventType,
      data: eventData
    });

    this.unsubscribeEscEvent = duel.globalHotKeysManager.on("escPressed", () => {
      this.props.onCompleted();
    });

    this.unsubscribeArrowRightEvent = duel.globalHotKeysManager.on("nextCommand", () => {
      this.props.onCompleted();
    });
  }

  public finish(): void {
    this.props.duel.events.dispatch("clear-ui-action");
    this.props.duel.events.dispatch("close-ui-menu", { group: "duel_notes", });

    this.unsubscribeEscEvent?.();
    this.unsubscribeEscEvent = undefined;

    this.unsubscribeArrowRightEvent?.();
    this.unsubscribeArrowRightEvent = undefined;
  }
}
