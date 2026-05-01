import { composeTheme } from "../themes/compose";

type UseUnistyles = typeof import("react-native-unistyles").useUnistyles;
type UnistylesMock = Omit<
  typeof import("react-native-unistyles"),
  "useUnistyles"
> & {
  mockTheme: ReturnType<typeof composeTheme>;
  useUnistyles: jest.MockedFunction<UseUnistyles>;
};

const unistyles = jest.requireMock("react-native-unistyles") as UnistylesMock;
const originalUseUnistyles = unistyles.useUnistyles as unknown as UseUnistyles;

unistyles.mockTheme = composeTheme("light", "default");
unistyles.useUnistyles = jest.fn(() => ({
  ...originalUseUnistyles(),
  theme: unistyles.mockTheme,
})) as jest.MockedFunction<UseUnistyles>;
