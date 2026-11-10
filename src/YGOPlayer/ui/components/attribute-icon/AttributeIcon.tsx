import { attributeIconSpec, ICON_SPRITE_GRID, spritePosition, type AttributeIconKind } from "./attribute-icon-spec";
import "./attribute-icon.css";

export type { AttributeIconKind } from "./attribute-icon-spec";

/**
 * The round attribute icon (DARK 闇, LIGHT 光…, Spell 魔, Trap 罠): the game's own artwork, from the
 * card icons sprite (data/images/ui/card_icons.png, served as --ygo-player-asset-ui-card-icons).
 * Size it with CSS (width/height) or the `size` prop.
 */
export function AttributeIcon({
  kind,
  size,
  className,
}: {
  kind: AttributeIconKind;
  size?: number;
  className?: string;
}) {
  const spec = attributeIconSpec(kind);
  return (
    <span
      className={`ygo-attribute-icon ygo-attribute-icon-${kind}${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={spec.label}
      title={spec.label}
      style={{
        ...(size ? { width: size, height: size } : {}),
        backgroundImage: "var(--ygo-player-asset-ui-card-icons)",
        backgroundSize: `${ICON_SPRITE_GRID * 100}% ${ICON_SPRITE_GRID * 100}%`,
        backgroundPosition: spritePosition(spec.sprite),
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
