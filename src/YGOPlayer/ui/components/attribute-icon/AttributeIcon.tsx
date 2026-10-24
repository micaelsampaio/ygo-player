import { useId } from "react";
import { attributeIconSpec, svgSafeId, type AttributeIconKind } from "./attribute-icon-spec";
import "./attribute-icon.css";

export type { AttributeIconKind } from "./attribute-icon-spec";

const KANJI_FONT = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif';

/**
 * The round attribute icon (DARK 闇, LIGHT 光…, Spell 魔, Trap 罠), drawn as an inline SVG so it
 * stays crisp at any size: dark edge, metallic ring, glossy coloured body, top highlight and an
 * outlined kanji. Size it with CSS (width/height) or the `size` prop.
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
  const id = svgSafeId(useId());
  const body = `${id}-body`;
  const ring = `${id}-ring`;
  const shine = `${id}-shine`;

  return (
    <svg
      className={`ygo-attribute-icon ygo-attribute-icon-${kind}${className ? ` ${className}` : ""}`}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={spec.label}
    >
      <title>{spec.label}</title>
      <defs>
        <radialGradient id={body} cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor={spec.hi} />
          <stop offset="48%" stopColor={spec.mid} />
          <stop offset="100%" stopColor={spec.lo} />
        </radialGradient>
        <linearGradient id={ring} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#c3c8d2" />
          <stop offset="55%" stopColor="#f4f5f8" />
          <stop offset="80%" stopColor="#8b919d" />
          <stop offset="100%" stopColor="#d9dce2" />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Thin dark edge, metallic ring, dark seam, coloured body. */}
      <circle cx="50" cy="50" r="49" fill="#15161b" />
      <circle cx="50" cy="50" r="46.5" fill={`url(#${ring})`} />
      <circle cx="50" cy="50" r="40.5" fill="#1b1d24" />
      <circle cx="50" cy="50" r="39" fill={`url(#${body})`} />
      {/* Soft gloss on the top half. */}
      <ellipse cx="50" cy="31" rx="29" ry="17" fill={`url(#${shine})`} />

      <g
        fontFamily={KANJI_FONT}
        fontWeight={900}
        fontSize="46"
        textAnchor="middle"
        aria-hidden="true"
      >
        {/* Alphabetic baseline placed so the CJK em box (≈0.88em up, 0.12em down) sits centred:
            dominant-baseline is ignored by some renderers. Drop shadow, then the outlined glyph. */}
        <text x="51.5" y="69" fill="#000" fillOpacity="0.45">{spec.glyph}</text>
        <text
          x="50"
          y="66.5"
          fill="#fffbea"
          stroke="#1a1020"
          strokeWidth="5"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {spec.glyph}
        </text>
      </g>
    </svg>
  );
}
