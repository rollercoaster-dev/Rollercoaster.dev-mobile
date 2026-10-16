import { Alert } from "react-native";
import { act, renderHook, waitFor } from "../../__tests__/test-utils";
import { useUnsavedExitGuard } from "../useUnsavedExitGuard";

const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockUsePreventRemove = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: mockGoBack, dispatch: mockDispatch }),
  usePreventRemove: (...args: unknown[]) => mockUsePreventRemove(...args),
}));

const copy = {
  title: "Discard unsaved changes?",
  message: "Your changes will be lost.",
  keep: "Keep editing",
  discard: "Discard",
};

const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  alert.mockRestore();
});

function pressAlertButton(label: string) {
  const buttons = alert.mock.calls.at(-1)?.[2] ?? [];
  const button = buttons.find((candidate) => candidate.text === label);
  expect(button).toBeDefined();
  act(() => button?.onPress?.());
}

/** The guard must be released (usePreventRemove(false)) before the leave runs. */
function expectReleasedBefore(leave: jest.Mock) {
  const released = mockUsePreventRemove.mock.invocationCallOrder.at(-1) ?? 0;
  const left = leave.mock.invocationCallOrder[0] ?? 0;
  expect(mockUsePreventRemove).toHaveBeenLastCalledWith(
    false,
    expect.any(Function),
  );
  expect(released).toBeLessThan(left);
}

describe("useUnsavedExitGuard", () => {
  it("exits clean forms immediately", () => {
    const { result } = renderHook(() =>
      useUnsavedExitGuard({ isDirty: false, copy }),
    );

    act(() => result.current.requestExit());

    expect(mockUsePreventRemove).toHaveBeenLastCalledWith(
      false,
      expect.any(Function),
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(alert).not.toHaveBeenCalled();
  });

  it("keeps a dirty form mounted until Discard, then replays a native removal", () => {
    renderHook(() => useUnsavedExitGuard({ isDirty: true, copy }));
    const [, onPreventedRemove] = mockUsePreventRemove.mock.lastCall!;
    const nativeAction = { type: "GO_BACK", source: "gesture" };

    act(() => onPreventedRemove({ data: { action: nativeAction } }));
    expect(alert).toHaveBeenCalledWith(copy.title, copy.message, [
      expect.objectContaining({ text: copy.keep, style: "cancel" }),
      expect.objectContaining({ text: copy.discard, style: "destructive" }),
    ]);

    pressAlertButton(copy.keep);
    expect(mockDispatch).not.toHaveBeenCalled();

    act(() => onPreventedRemove({ data: { action: nativeAction } }));
    pressAlertButton(copy.discard);
    expect(mockDispatch).toHaveBeenCalledWith(nativeAction);
    expectReleasedBefore(mockDispatch);
  });

  it.each([
    ["resolves", () => Promise.resolve()],
    ["rejects", () => Promise.reject(new Error("cleanup failed"))],
  ])("leaves after Discard even when onDiscard %s", async (_label, outcome) => {
    const onDiscard = jest.fn(outcome);
    const { result } = renderHook(() =>
      useUnsavedExitGuard({ isDirty: true, copy, onDiscard }),
    );

    act(() => result.current.requestExit());
    expect(onDiscard).not.toHaveBeenCalled();
    pressAlertButton(copy.discard);

    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expectReleasedBefore(mockGoBack);
  });

  it("confirms a visible back and leaves only after Discard", () => {
    const { result } = renderHook(() =>
      useUnsavedExitGuard({ isDirty: true, copy }),
    );

    act(() => result.current.requestExit());
    expect(mockGoBack).not.toHaveBeenCalled();
    pressAlertButton(copy.discard);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expectReleasedBefore(mockGoBack);
  });

  it("lets a successful save leave without a discard prompt", () => {
    const { result } = renderHook(() =>
      useUnsavedExitGuard({ isDirty: true, copy }),
    );

    act(() => result.current.exitAfterSave(() => mockGoBack()));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expectReleasedBefore(mockGoBack);
    expect(alert).not.toHaveBeenCalled();
  });
});
