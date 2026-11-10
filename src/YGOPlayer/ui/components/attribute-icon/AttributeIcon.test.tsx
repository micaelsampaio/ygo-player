import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AttributeIcon } from "./AttributeIcon";
import { ATTRIBUTE_ICON_SPECS, attributeIconSpec, isAttributeIconKind, spritePosition, svgSafeId } from "./attribute-icon-spec";

describe("attributeIconSpec", () => {
  it("maps each kind to its kanji and label", () => {
    expect(attributeIconSpec("dark")).toMatchObject({ glyph: "闇", label: "DARK attribute" });
    expect(attributeIconSpec("light")).toMatchObject({ glyph: "光", label: "LIGHT attribute" });
    expect(attributeIconSpec("earth").glyph).toBe("地");
    expect(attributeIconSpec("water").glyph).toBe("水");
    expect(attributeIconSpec("fire").glyph).toBe("炎");
    expect(attributeIconSpec("wind").glyph).toBe("風");
    expect(attributeIconSpec("divine").glyph).toBe("神");
    expect(attributeIconSpec("spell")).toMatchObject({ glyph: "魔", label: "Spell card" });
    expect(attributeIconSpec("trap")).toMatchObject({ glyph: "罠", label: "Trap card" });
  });

  it("gives every kind its own body colour", () => {
    const mids = Object.values(ATTRIBUTE_ICON_SPECS).map((spec) => spec.mid);
    expect(new Set(mids).size).toBe(mids.length);
    expect(attributeIconSpec("fire").mid).toBe("#e0301c");
  });

  it("recognises kinds", () => {
    expect(isAttributeIconKind("wind")).toBe(true);
    expect(isAttributeIconKind("toString")).toBe(false);
    expect(isAttributeIconKind("LAUGH")).toBe(false);
  });

  it("makes useId output safe for url(#…)", () => {
    expect(svgSafeId(":r1:")).toBe("ygo-attr-r1");
    expect(svgSafeId("«r2»")).toBe("ygo-attr-r2");
  });
});

describe("AttributeIcon", () => {
  it("shows the game's own icon from the card icons sprite, labelled", () => {
    const html = renderToStaticMarkup(<AttributeIcon kind="light" size={30} />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="LIGHT attribute"');
    expect(html).toContain("var(--ygo-player-asset-ui-card-icons)");
    expect(html).toContain("background-size:800% 800%");
    // LIGHT: column 1, row 6 of the 8 × 8 sheet.
    expect(html).toContain("background-position:14.2857% 85.7143%");
    expect(html).toContain("width:30px");
  });

  it("puts every kind on its own cell (Trap and Spell on the next row)", () => {
    const cells = Object.values(ATTRIBUTE_ICON_SPECS).map((spec) => spec.sprite.join(","));
    expect(new Set(cells).size).toBe(cells.length);
    expect(spritePosition(attributeIconSpec("dark").sprite)).toBe("0% 85.7143%");
    expect(spritePosition(attributeIconSpec("spell").sprite)).toBe("14.2857% 100%");
  });
});
