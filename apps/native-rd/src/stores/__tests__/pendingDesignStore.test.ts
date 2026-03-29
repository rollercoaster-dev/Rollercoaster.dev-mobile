import { pendingDesignStore } from "../pendingDesignStore";

afterEach(() => {
  pendingDesignStore.clear();
});

describe("pendingDesignStore", () => {
  it("set() and get() store and retrieve a design", () => {
    pendingDesignStore.set("goal-1", '{"shape":"circle"}');
    expect(pendingDesignStore.get("goal-1")).toBe('{"shape":"circle"}');
  });

  it("get() returns undefined for missing keys", () => {
    expect(pendingDesignStore.get("nonexistent")).toBeUndefined();
  });

  it("consume() returns the value and removes it", () => {
    pendingDesignStore.set("goal-2", '{"shape":"hexagon"}');
    expect(pendingDesignStore.consume("goal-2")).toBe('{"shape":"hexagon"}');
    expect(pendingDesignStore.get("goal-2")).toBeUndefined();
  });

  it("consume() returns undefined for missing keys", () => {
    expect(pendingDesignStore.consume("nonexistent")).toBeUndefined();
  });

  it("clear() removes all entries", () => {
    pendingDesignStore.set("goal-a", "{}");
    pendingDesignStore.set("goal-b", "{}");
    pendingDesignStore.clear();
    expect(pendingDesignStore.get("goal-a")).toBeUndefined();
    expect(pendingDesignStore.get("goal-b")).toBeUndefined();
  });
});
