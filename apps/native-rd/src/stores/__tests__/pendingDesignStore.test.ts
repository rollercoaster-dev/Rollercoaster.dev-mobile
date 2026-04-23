import { pendingDesignStore } from "../pendingDesignStore";

const entry = (designJson: string, pngBase64 = "AAAA") => ({
  designJson,
  pngBase64,
});

afterEach(() => {
  pendingDesignStore.clear();
});

describe("pendingDesignStore", () => {
  it("set() and get() store and retrieve an entry", () => {
    pendingDesignStore.set("goal-1", entry('{"shape":"circle"}', "PNGDATA"));
    expect(pendingDesignStore.get("goal-1")).toEqual({
      designJson: '{"shape":"circle"}',
      pngBase64: "PNGDATA",
    });
  });

  it("get() returns undefined for missing keys", () => {
    expect(pendingDesignStore.get("nonexistent")).toBeUndefined();
  });

  it("consume() returns the entry and removes it", () => {
    pendingDesignStore.set("goal-2", entry('{"shape":"hexagon"}'));
    expect(pendingDesignStore.consume("goal-2")).toEqual({
      designJson: '{"shape":"hexagon"}',
      pngBase64: "AAAA",
    });
    expect(pendingDesignStore.get("goal-2")).toBeUndefined();
  });

  it("consume() returns undefined for missing keys", () => {
    expect(pendingDesignStore.consume("nonexistent")).toBeUndefined();
  });

  it("clear() removes all entries", () => {
    pendingDesignStore.set("goal-a", entry("{}"));
    pendingDesignStore.set("goal-b", entry("{}"));
    pendingDesignStore.clear();
    expect(pendingDesignStore.get("goal-a")).toBeUndefined();
    expect(pendingDesignStore.get("goal-b")).toBeUndefined();
  });
});
