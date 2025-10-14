import { DuelEventHandlerProps } from "..";
import { YGODuelEvents } from "ygo-core";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";

interface AdmitDefeatEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.AdmitDefeat;
}

export class AdmitDefeatEventHandler extends YGOCommandHandler {
  private props: AdmitDefeatEventHandlerProps;
  private timeoutId?: number;

  constructor(props: AdmitDefeatEventHandlerProps) {
    super("admit_defeat_command");
    this.props = props;
  }

  public start(): void {
    // Admit defeat doesn't require visual effects, complete in next frame
    this.timeoutId = setTimeout(() => {
      this.props.onCompleted();
    }, 0) as unknown as number;
  }

  public finish(): void {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
  }
}