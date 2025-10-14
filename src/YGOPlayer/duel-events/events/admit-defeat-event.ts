import { DuelEventHandlerProps } from "..";
import { YGODuelEvents } from "ygo-core";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";

interface AdmitDefeatEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.AdmitDefeat;
}

export class AdmitDefeatEventHandler extends YGOCommandHandler {
  private props: AdmitDefeatEventHandlerProps;

  constructor(props: AdmitDefeatEventHandlerProps) {
    super("admit_defeat_command");
    this.props = props;
  }

  public start(): void {
    // Admit defeat doesn't require visual effects, complete immediately
    this.props.onCompleted();
  }
}