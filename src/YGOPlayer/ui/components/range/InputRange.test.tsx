import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import InputRange from "./InputRange";

const render = (value: number, min?: number, max?: number) =>
  renderToStaticMarkup(<InputRange value={value} min={min} max={max} onChange={() => {}} />);

describe("InputRange", () => {
  it("fills the track up to the value (--progress, in percent of the range)", () => {
    expect(render(0.5)).toContain("--progress:50%");
    expect(render(0)).toContain("--progress:0%");
    expect(render(30, 10, 50)).toContain("--progress:50%");
  });

  it("is a range input with the given bounds", () => {
    const html = render(2, 0, 4);
    expect(html).toContain('type="range"');
    expect(html).toContain('min="0"');
    expect(html).toContain('max="4"');
  });
});
