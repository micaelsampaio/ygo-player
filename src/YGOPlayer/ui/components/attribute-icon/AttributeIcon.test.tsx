import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AttributeIcon } from "./AttributeIcon";
import { ATTRIBUTE_ICON_SPECS, attributeIconSpec, isAttributeIconKind, svgSafeId } from "./attribute-icon-spec";

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
  it("renders an accessible SVG with the kanji", () => {
    const html = renderToStaticMarkup(<AttributeIcon kind="light" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="LIGHT attribute"');
    expect(html).toContain("<title>LIGHT attribute</title>");
    expect(html).toContain("光");
    expect(html).toContain("#f2c418");
  });

  it("uses unique gradient ids per instance", () => {
    const html = renderToStaticMarkup(<><AttributeIcon kind="dark" /><AttributeIcon kind="dark" /></>);
    const ids = [...html.matchAll(/radialGradient id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    expect(html).toContain(`url(#${ids[0]})`);
  });
});
