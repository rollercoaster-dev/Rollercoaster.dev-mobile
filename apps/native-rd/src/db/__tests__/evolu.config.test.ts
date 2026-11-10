/**
 * Privacy guard for the Evolu instance config.
 *
 * Without an explicit `transports`, @evolu/common falls back to
 * `wss://free.evoluhq.com` and syncs the database to a third-party relay.
 * The app promises data never leaves the phone, so the config src/db/evolu.ts
 * actually passes to createEvolu must keep `transports` empty until sync ships
 * as an opt-in.
 */
const mockCreateEvoluWithSchema = jest.fn((..._args: unknown[]) => ({}));
const mockCreateEvolu = jest.fn(
  (..._args: unknown[]) => mockCreateEvoluWithSchema,
);

jest.mock("@evolu/common", () => ({
  createEvolu: mockCreateEvolu,
  SimpleName: { orThrow: (name: string) => name },
}));
jest.mock("../schema", () => ({ Schema: {} }));

describe("evolu instance config", () => {
  it("passes an explicit empty transports list so nothing syncs off-device", () => {
    // src/db/__tests__/setup.ts mocks "../evolu" for every suite; load the
    // real module so createEvolu receives the config the app ships.
    jest.isolateModules(() => {
      jest.requireActual("../evolu");
    });

    expect(mockCreateEvoluWithSchema).toHaveBeenCalledTimes(1);
    const config = mockCreateEvoluWithSchema.mock.calls[0][1] as {
      transports?: unknown;
    };
    expect(config.transports).toEqual([]);
  });
});
