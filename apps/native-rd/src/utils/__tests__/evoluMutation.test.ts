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
});
