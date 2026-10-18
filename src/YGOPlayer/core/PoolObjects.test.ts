import { describe, expect, it, vi } from "vitest";
import { PoolObjects } from "./PoolObjects";

/** An entity-like pooled object: a gameObject and a disable() hook. */
function makeEntity(id: number) {
  return { id, visible: true, disable: vi.fn(), gameObject: { visible: true } };
}

describe("PoolObjects", () => {
  it("prefills `amount` objects, hidden, and hands them out before making new ones", () => {
    let next = 0;
    const create = vi.fn(() => makeEntity(next++));
    const pool = new PoolObjects({ name: "fx", amount: 2, create });
    pool.create();
    expect(create).toHaveBeenCalledTimes(2);

    const a = pool.get<ReturnType<typeof makeEntity>>();
    const b = pool.get<ReturnType<typeof makeEntity>>();
    expect([a.id, b.id].sort()).toEqual([0, 1]);
    for (const o of [a, b]) {
      expect(o.visible).toBe(false);
      expect(o.gameObject.visible).toBe(false);
      expect(o.disable).toHaveBeenCalledTimes(1);
    }
    expect(create).toHaveBeenCalledTimes(2);

    // Empty: a new one is made on demand.
    const c = pool.get<ReturnType<typeof makeEntity>>();
    expect(c.id).toBe(2);
    expect(create).toHaveBeenCalledTimes(3);
  });

  it("hides an object given back and reuses it next", () => {
    const pool = new PoolObjects({ name: "fx", amount: 0, create: () => makeEntity(0) });
    const obj = pool.get<ReturnType<typeof makeEntity>>();
    obj.visible = true;
    obj.gameObject.visible = true;

    pool.enquene(obj);
    expect(obj.visible).toBe(false);
    expect(obj.gameObject.visible).toBe(false);
    expect(obj.disable).toHaveBeenCalledTimes(2);
    expect(pool.get()).toBe(obj);
  });

  it("pools plain objects that have none of the hooks", () => {
    const plain = {};
    const pool = new PoolObjects({ name: "plain", amount: 1, create: () => plain });
    pool.create();
    expect(pool.get()).toBe(plain);
    expect(pool.name).toBe("plain");
  });
});
