import { YGOCore, YGOGameUtils } from "ygo-core";
import { YGODuel } from "../../../core/YGODuel";
import { DuelLogContainer, DuelLogRow } from "./duel-log-components";
import type { CommandType } from "ygo-core";
import { memo } from "react";

const HIDE_CARD_COMMANDS = new Set<CommandType>([
  "Draw From Deck"
])

const SHOW_CARD_COMMANDS = new Set<CommandType>([
  "To Hand",
  "Destroy",
])

export const DefaultLogRow = memo(
  function DefaultLogRow({
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
      return <DuelLogRow log={log}>
        <DuelLogContainer>
          {log.type}
        </DuelLogContainer>
      </DuelLogRow>;
    }

    const orginZone = log.originZone || log.zone;
    const zone = log.originZone && log.zone ? log.zone : undefined;
    const originZoneClassName = getZoneData(orginZone)!;
    const zoneClassName = getZoneData(zone)!;
    const isFaceDown = SHOW_CARD_COMMANDS.has(log.type) ? false : HIDE_CARD_COMMANDS.has(log.type) ? true : log.position ? !log.position.includes("faceup") : false;

    return (
      <DuelLogRow log={log}>
        <DuelLogContainer>
          <div className="ygo-duel-log-default-row">
            <div className="ygo-text-sm ygo-mb-1 ygo-text-bold">{isFaceDown ? "" : card.name}</div>
            <div className="ygo-flex ygo-gap-2">
              <div>
                {
                  isFaceDown ? <>
                    <img
                      src={duel.createCdnUrl("/images/card_back.png")}
                      style={{ width: "45px" }}
                    />
                  </> : <>
                    <img
                      onMouseDown={(event: any) => duel.events.dispatch("on-card-mouse-down", { card, event })}
                      onMouseUp={(event: any) => duel.events.dispatch("on-card-mouse-up", { card, event })}
                      onTouchStart={(event: any) => duel.events.dispatch("on-card-mouse-down", { card, event })}
                      onTouchEnd={(event: any) => duel.events.dispatch("on-card-mouse-up", { card, event })}
                      onClick={() => duel.gameActions.setSelectedCard({ player: log.player, card })}
                      src={card.images.small_url}
                      style={{ width: "45px" }}
                    />
                  </>
                }

              </div>
              <div className="ygo-flex-grow-1">
                <div className="ygo-text-sm ygo-mb-1 ygo-text-bold ygo-text-center">
                  {log.type}
                </div>
                <div className="ygo-flex ygo-gap-2">
                  <div>
                    <div className={originZoneClassName}></div>
                  </div>
                  {log.originZone && log.zone && <>
                    <div>
                      <div className={`ygo-icon-game-zone-arrow ygo-player-${log.player}`}></div>
                    </div>
                    <div>
                      <div className={zoneClassName}></div>
                    </div>
                  </>}
                </div>
              </div>
            </div>
          </div>
        </DuelLogContainer>
      </DuelLogRow>
    );
  }
);

function getZoneData(zone: string | undefined) {
  if (!zone) return null;

  const zoneData = YGOGameUtils.getZoneData(zone as any);
  const zoneId = YGOGameUtils.createZone(zoneData.zone, 0, zoneData.zoneIndex).toLowerCase();
  let zoneStr = `ygo-icon-game-zone ygo-player-${zoneData.player} ygo-icon-game-zone-container`;
  if (zoneData.zone === "ORU" || zoneData.zone === "ORUEMZ") {
    zoneStr += ` ygo-icon-game-zone-oru ygo-icon-game-zone-container-rounded`;
  } else if (zoneData.zone === "M" || zoneData.zone === "S" || zoneData.zone === "EMZ") {
    zoneStr += ` ygo-icon-game-zone-${zoneId}`;
  } else {
    zoneStr += ` ygo-icon-game-zone-${zoneData.zone.toLowerCase()} ygo-icon-game-zone-container-rounded`;
  }

  return zoneStr
}
