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
  const [battleInfo, setBattleInfo] = useState<YGOBattleInfo>(() => calculateBattleInfo(attackingCard, attackedCard))
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

  // Typed as text so "-" can be typed on the way to a negative number.
  const [damageText, setDamageText] = useState(() => String(battleInfo.battleDamage ?? 0));

  useEffect(() => {
    const battleInfo = calculateBattleInfo(attackingCard, attackedCard);
    setBattleInfo(battleInfo);
    setDamageText(String(battleInfo.battleDamage ?? 0));
  }, propsChanges)

  return (
    <CardMenu indicator menuRef={menuRef}>
      <button type="button" className="ygo-card-item" onClick={attack}>
        Only Attack (Manual)
      </button>
      <div className="ygo-card-item-divider"></div>
      <label className="ygo-flex ygo-gap-1" style={{ alignItems: "center" }}>
        <input
          style={{ display: "inline-block", width: "auto" }}
          type="checkbox"
          checked={!!battleInfo?.attacking?.destroyed}
          onChange={(e) => setBattleInfo((b) => ({ ...b, attacking: { destroyed: e.target.checked } }))}
        />
        Destroy the attacker
      </label>

      <label className="ygo-flex ygo-gap-1" style={{ alignItems: "center" }}>
        <input
          style={{ display: "inline-block", width: "auto" }}
          type="checkbox"
          checked={!!battleInfo?.attacked?.destroyed}
          onChange={(e) => setBattleInfo((b) => ({ ...b, attacked: { destroyed: e.target.checked } }))}
        />
        Destroy the attacked monster
      </label>

      <div className="ygo-mt-2">
        <label htmlFor="ygo-battle-damage">Battle damage</label>
        <div className="ygo-pt-2">
          <YGOInput
            id="ygo-battle-damage"
            inputMode="numeric"
            value={damageText}
            onChange={(e) => {
              setDamageText(e.target.value);
              const value = Number(e.target.value);
              if (Number.isFinite(value)) setBattleInfo((b) => ({ ...b, battleDamage: value }));
            }}
          />
        </div>
        <div className="ygo-mt-1" style={{ opacity: 0.6, fontSize: "12px" }}>
          Positive: Player {2 - player} takes it. Negative: Player {player + 1} does.
        </div>
      </div>

      <button type="button" className="ygo-card-item" onClick={() => attackWithBattleInfo(battleInfo)}>
        Attack With Battle info
      </button>

    </CardMenu>
  );
}
