import { describe, expect, it, vi } from "vitest";
import { YGOEntity } from "./YGOEntity";
import { YGOComponent } from "./YGOComponent";
import { YGOMath } from "./YGOMath";

class TestEntity extends YGOEntity {
  onDestroy = vi.fn();
}

class TestComponent extends YGOComponent {
  start = vi.fn();
  update = vi.fn();
  onDestroy = vi.fn();
}

describe("YGOEntity", () => {
  it("starts a component when added and finds it by name", () => {
    const entity = new TestEntity();
    const comp = new TestComponent("a");
    entity.addComponent("a", comp);
    expect(comp.start).toHaveBeenCalledTimes(1);
    expect(entity.getComponent<TestComponent>("a")).toBe(comp);
  });

  it("updates only the enabled components", () => {
    const entity = new TestEntity();
    const on = new TestComponent("on");
    const off = new TestComponent("off");
    entity.addComponent("on", on);
    entity.addComponent("off", off);
    off.setEnabled(false);
    entity.update(0.5);
    expect(on.update).toHaveBeenCalledWith(0.5);
    expect(off.update).not.toHaveBeenCalled();
  });

  it("removes a component by name", () => {
    const entity = new TestEntity();
    const comp = new TestComponent("a");
    entity.addComponent("a", comp);
    expect(entity.removeComponent("a")).toBe(comp);
    expect(entity.getComponent("a")).toBeUndefined();
    expect(entity.removeComponent("a")).toBeNull();
  });

  it("removes a component by instance, and only that one", () => {
    const entity = new TestEntity();
    const first = new TestComponent("first");
    const second = new TestComponent("second");
    entity.addComponent("first", first);
    entity.addComponent("second", second);

    expect(entity.removeComponent(second)).toBe(second);
    expect(entity.getComponent("second")).toBeUndefined();
    expect(entity.getComponent("first")).toBe(first);
    expect(entity.removeComponent(new TestComponent("other"))).toBeNull();
  });

  it("destroying disables it and destroys every component", () => {
    const entity = new TestEntity();
    const comp = new TestComponent("a");
    entity.addComponent("a", comp);
    entity.destroyEntity();
    expect(entity.enabled).toBe(false);
    expect(entity.onDestroy).toHaveBeenCalledTimes(1);
    expect(comp.onDestroy).toHaveBeenCalledTimes(1);
  });

  it("enable / disable / setActive toggle `enabled`", () => {
    const entity = new TestEntity();
    entity.disable();
    expect(entity.enabled).toBe(false);
    entity.enable();
    expect(entity.enabled).toBe(true);
    entity.setActive(false);
    expect(entity.enabled).toBe(false);
  });
});

describe("YGOMath", () => {
  it("converts between degrees and radians", () => {
    expect(YGOMath.degToRad(180)).toBeCloseTo(Math.PI);
    expect(YGOMath.radToDeg(Math.PI / 2)).toBeCloseTo(90);
    expect(YGOMath.radToDeg(YGOMath.degToRad(37))).toBeCloseTo(37);
  });

  it("builds an Euler from degrees", () => {
    const e = YGOMath.degToRadEuler(90, 0, -45);
    expect(e.x).toBeCloseTo(Math.PI / 2);
    expect(e.y).toBe(0);
    expect(e.z).toBeCloseTo(-Math.PI / 4);
  });
});
