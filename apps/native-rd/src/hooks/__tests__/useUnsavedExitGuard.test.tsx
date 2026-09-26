import { Alert } from "react-native";
import { act, renderHook } from "../../__tests__/test-utils";
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
    expect(mockUsePreventRemove).toHaveBeenLastCalledWith(
      false,
      expect.any(Function),
    );
    expect(mockDispatch).toHaveBeenCalledWith(nativeAction);
  });

  it("confirms a visible back and leaves only after Discard", () => {
    const { result } = renderHook(() =>
      useUnsavedExitGuard({ isDirty: true, copy }),
    );

    act(() => result.current.requestExit());
    expect(mockGoBack).not.toHaveBeenCalled();
    pressAlertButton(copy.discard);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it("lets a successful save leave without a discard prompt", () => {
    const { result } = renderHook(() =>
      useUnsavedExitGuard({ isDirty: true, copy }),
    );

    act(() => result.current.exitAfterSave(() => mockGoBack()));

    expect(mockUsePreventRemove).toHaveBeenLastCalledWith(
      false,
      expect.any(Function),
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(alert).not.toHaveBeenCalled();
  });
});
