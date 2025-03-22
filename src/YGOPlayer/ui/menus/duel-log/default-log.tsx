import { YGOCore } from "ygo-core";
import { YGODuel } from "../../../core/YGODuel";

export function DefaultLogRow({
  log,
  duel,
  ygo,
}: {
  log: any;
  duel: YGODuel;
  ygo: InstanceType<typeof YGOCore>;
}) {
  const card = ygo.state.getCardData(log.id)!;

  if (!card) {
    return <div className="ygo-duel-log-default-row">{log.type}</div>;
  }

  return (
    <div className="ygo-duel-log-default-row">
      <div className="ygo-text-4">{card.name}</div>
      <div className="ygo-flex ygo-gap-2">
        <div>
          <img
            src={`${duel.config.cdnUrl}/images/cards_small/${card.id}.jpg`}
            style={{ width: "40px" }}
          />
        </div>
        <div className="ygo-flex-grow-1">
          <div>{log.type}</div>
          <div className="ygo-flex ygo-gap-2">
            <div>{log.originZone || log.zone}</div>
            {log.originZone && log.zone && (
              <>
                <div className="flex-grow-1">{"->"}</div>
                <div>{log.zone}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
