import { shouldHideTabBar } from "../tabBarVisibility";

function tabWithStack(names: string[], index = names.length - 1) {
  return {
    state: {
      index,
      routes: names.map((name) => ({ key: `${name}-key`, name })),
    },
  } as unknown as Parameters<typeof shouldHideTabBar>[0];
}

describe("shouldHideTabBar (#798)", () => {
  it.each(["NewGoal", "CompletionFlow", "Welcome"])(
    "hides the bar on Android when %s is focused",
    (name) => {
      expect(shouldHideTabBar(tabWithStack(["Goals", name]), "android")).toBe(
        true,
      );
    },
  );

  it("keeps the bar on iOS, where the modal already covers it", () => {
    expect(shouldHideTabBar(tabWithStack(["Goals", "NewGoal"]), "ios")).toBe(
      false,
    );
  });

  it("keeps the bar on regular stack screens", () => {
    expect(
      shouldHideTabBar(tabWithStack(["Goals", "FocusMode"]), "android"),
    ).toBe(false);
  });

  it("follows the focused index, not the top of the stack", () => {
    expect(
      shouldHideTabBar(tabWithStack(["Goals", "NewGoal"], 0), "android"),
    ).toBe(false);
  });

  it("keeps the bar before the nested stack has state", () => {
    expect(shouldHideTabBar({}, "android")).toBe(false);
  });

  it("uses the last route when a partial state has no index", () => {
    const route = {
      state: { routes: [{ name: "Goals" }, { name: "NewGoal" }] },
    } as unknown as Parameters<typeof shouldHideTabBar>[0];
    expect(shouldHideTabBar(route, "android")).toBe(true);
  });
});
