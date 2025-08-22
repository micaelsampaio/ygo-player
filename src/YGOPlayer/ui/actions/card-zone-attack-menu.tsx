import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Card, FieldZone } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { calculateBattleInfo, getTransformFromCamera, YGOBattleInfo, } from "../../scripts/ygo-utils";
import { CardMenu } from "../components/CardMenu";
import { GameCard } from "../../game/GameCard";
import { YGOInput } from "../components/Input";

export function CardZoneAttackMenuAction({
  duel,
  player,

  attackingCard,
  attackingGameCard,
  attackingZone,

  attackedCard,
  attackedGameCard,
  attackedZone,

  clearAction
}: {
  duel: YGODuel;
  player: number;
  attackingGameCard: GameCard;
  attackingZone: FieldZone;
  attackingCard: Card;

  attackedGameCard: GameCard;
  attackedZone: FieldZone;
  attackedCard: Card;

  clearAction: () => void
}) {
  const [battleInfo, setBattleInfo] = useState<YGOBattleInfo>({} as any)
  const menuRef = useRef<HTMLDivElement>();
  const propsChanges = [attackingCard, attackedCard, attackedZone, attackingZone];

  const attack = useCallback(() => {
    clearAction();

    duel.gameActions.attack({
      attackingId: attackingCard.id,
      attackingZone: attackingZone,
      attackedId: attackedCard.id,
      attackedZone: attackedZone,
    });
  }, propsChanges);

  const attackWithBattleInfo = useCallback((battleInfo: YGOBattleInfo) => {
    clearAction();

    duel.gameActions.attack({
      attackingId: attackingCard.id,
      attackingZone: attackingZone,
      attackedId: attackedCard.id,
      attackedZone: attackedZone,
      destroyAttacked: battleInfo.attacked.destroyed,
      destroyAttacking: battleInfo.attacking.destroyed,
      battleDamage: battleInfo.battleDamage,
    });

  }, propsChanges);

  useLayoutEffect(() => {
    const container = menuRef.current!;
    const size = container.getBoundingClientRect();
    const { x, y, width, height } = getTransformFromCamera(
      duel,
      attackedGameCard.gameObject
    );
    container.style.top = Math.max(0, y - size.height) + "px";
    container.style.left = x - size.width / 2 + width / 2 + "px";
  }, propsChanges);

  useEffect(() => {
    const battleInfo = calculateBattleInfo(attackingCard, attackedCard);
    setBattleInfo(battleInfo);
  }, propsChanges)

  return (
    <CardMenu indicator menuRef={menuRef}>
      <button type="button" className="ygo-card-item" onClick={attack}>
        Only Attack (Manual)
      </button>
      <div className="ygo-card-item-divider"></div>
      <div>
        <input
          style={{ display: "inline-block", width: "auto" }}
          type="checkbox"
          checked={battleInfo?.attacking?.destroyed}
        // onChange={e => onChangeCheckBox(e, "showCardWhenPlayed")}
        />
        Destroy Attacking
      </div>

      <div>
        <input
          style={{ display: "inline-block", width: "auto" }}
          type="checkbox"
          checked={battleInfo?.attacked?.destroyed}
        // onChange={e => onChangeCheckBox(e, "showCardWhenPlayed")}
        />
        Destroy Attacked
      </div>

      <div className="ygo-mt-2">
        <label htmlFor="">Battle Damage</label>
        <div className="ygo-pt-2">
          <YGOInput value={battleInfo?.battleDamage?.toString()} />
        </div>
        <div className="ygo-mt-1" style={{ opacity: 0.6, fontSize: "12px" }}>
          <div>
            Positive Value P{(1 - player + 1)}
          </div>
          <div>
            Negative value P{player + 1}
          </div>
        </div>
      </div>

      <button type="button" className="ygo-card-item" onClick={() => attackWithBattleInfo(battleInfo)}>
        Attack With Battle info
      </button>

    </CardMenu>
  );
}
