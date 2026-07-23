import type { Result } from "@evolu/common";
import { runEvoluMutation } from "../evoluMutation";

describe("runEvoluMutation", () => {
  it("returns true and does not call onFailure on an ok Result", () => {
    const onFailure = jest.fn();
    const ok = runEvoluMutation(
      () =>
        ({ ok: true, value: { id: "row-1" } }) as Result<{ id: string }, never>,
      onFailure,
    );

    expect(ok).toBe(true);
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("returns false and forwards result.error on an { ok: false } Result", () => {
    const onFailure = jest.fn();
    const error = { type: "WriteError", code: 42 };
    const ok = runEvoluMutation(
      () => ({ ok: false, error }) as Result<never, typeof error>,
      onFailure,
    );

    expect(ok).toBe(false);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledWith(error);
  });

  it("returns false and forwards the thrown error when mutate throws", () => {
    const onFailure = jest.fn();
    const thrown = new Error("validation failed");
    const ok = runEvoluMutation(() => {
      throw thrown;
    }, onFailure);

    expect(ok).toBe(false);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledWith(thrown);
  });

  it("does not invoke onFailure a second time when onFailure itself throws", () => {
    const handlerError = new Error("handler blew up");
    const onFailure = jest.fn(() => {
      throw handlerError;
    });

    // The handler's own throw must propagate to the caller, not be swallowed
    // and re-routed back into onFailure with the wrong error.
    expect(() =>
      runEvoluMutation(
        () =>
          ({ ok: false, error: { type: "WriteError" } }) as Result<
            never,
            unknown
          >,
        onFailure,
      ),
    ).toThrow(handlerError);
    expect(onFailure).toHaveBeenCalledTimes(1);
  });
});
