import { renderHook } from "@testing-library/react-native";
import type { ScrollView } from "react-native";
import { useStickToScrollEnd } from "../useStickToScrollEnd";

function setup() {
  const { result } = renderHook(() => useStickToScrollEnd());
  const scrollToEnd = jest.fn();
  result.current.ref.current = { scrollToEnd } as unknown as ScrollView;
  const layout = (height: number) =>
    result.current.onLayout({
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height } },
    } as never);
  const content = (height: number) =>
    result.current.onContentSizeChange(400, height);
  const scroll = (y: number) =>
    result.current.onScroll({
      nativeEvent: { contentOffset: { x: 0, y } },
    } as never);
  return { result, scrollToEnd, layout, content, scroll };
}

describe("useStickToScrollEnd", () => {
  it("does not scroll on the mounted list's first content size", () => {
    const { scrollToEnd, layout, content } = setup();
    layout(700);
    content(1000); // a long list opening
    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it("re-pins to the end without animation when the viewport shrinks at the end", () => {
    const { scrollToEnd, layout, content, scroll } = setup();
    layout(700);
    content(1000);
    scroll(300); // 300 + 700 = 1000 → at end
    layout(400); // keyboard up
    expect(scrollToEnd).toHaveBeenCalledTimes(1);
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: false });
  });

  it("leaves the offset alone when the viewport shrinks mid-list", () => {
    const { scrollToEnd, layout, content, scroll } = setup();
    layout(700);
    content(1000);
    scroll(100);
    layout(400);
    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it("animates to the end when content grows while at the end", () => {
    const { scrollToEnd, layout, content, scroll } = setup();
    layout(700);
    content(1000);
    scroll(300);
    content(1150); // a row was added
    expect(scrollToEnd).toHaveBeenCalledTimes(1);
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
  });

  it("does not follow growth when the user has scrolled up", () => {
    const { scrollToEnd, layout, content, scroll } = setup();
    layout(700);
    content(1000);
    scroll(0);
    content(1150);
    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it("treats content shorter than the viewport as at the end", () => {
    const { scrollToEnd, layout, content } = setup();
    layout(700);
    content(500);
    content(800); // grows past the viewport for the first time
    expect(scrollToEnd).toHaveBeenCalledTimes(1);
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
  });
});
