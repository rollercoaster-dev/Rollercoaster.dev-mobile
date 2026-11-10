const { RuleTester } = require("eslint");
const rule = require("../../eslint-rules/no-native-text-import");

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

const error = { messageId: "noNativeText" };

ruleTester.run("no-native-text-import", rule, {
  valid: [
    // Other react-native imports are fine
    {
      code: 'import { View, TextInput } from "react-native";',
      filename: "/app/src/components/Card/Card.tsx",
    },
    // The shared Text component
    {
      code: 'import { Text } from "../Text";',
      filename: "/app/src/components/Card/Card.tsx",
    },
    // Exempt: the shared Text component wraps RN Text
    {
      code: 'import { Text as RNText } from "react-native";',
      filename: "/app/src/components/Text/Text.tsx",
    },
    // A Text from some other module
    {
      code: 'import { Text } from "react-native-svg";',
      filename: "/app/src/badges/PathText.tsx",
    },
  ],
  invalid: [
    {
      code: 'import { Text } from "react-native";',
      filename: "/app/src/components/Card/Card.tsx",
      errors: [error],
    },
    {
      code: 'import { View, Text as RNText } from "react-native";',
      filename: "/app/src/screens/Home/Home.tsx",
      errors: [error],
    },
    {
      code: [
        "import {",
        "  Pressable,",
        "  Text,",
        "  View,",
        '} from "react-native";',
      ].join("\n"),
      filename: "/app/src/badges/ShapeSelector.tsx",
      errors: [{ ...error, line: 3 }],
    },
    // A directory merely named like the exempt one is not exempt
    {
      code: 'import { Text } from "react-native";',
      filename: "/app/src/components/TextBlock/TextBlock.tsx",
      errors: [error],
    },
    // Re-exporting RN Text is the same bypass
    {
      code: 'export { Text } from "react-native";',
      filename: "/app/src/components/index.ts",
      errors: [error],
    },
  ],
});

// The stories/tests exemption and type-only imports live in the real config
// (a `files` override and the TypeScript parser), so lint through it.
describe("no-native-text-import in eslint.config.js", () => {
  const path = require("path");
  const { ESLint } = require("eslint");
  const appRoot = path.resolve(__dirname, "../../..");
  // Pass the config in directly: ESLint's own loader uses a dynamic import
  // that Jest can't run without --experimental-vm-modules.
  const eslint = new ESLint({
    cwd: appRoot,
    overrideConfigFile: true,
    overrideConfig: require("../../../eslint.config.js"),
  });
  const RN_TEXT =
    'import { Text } from "react-native";\nexport const x = Text;\n';

  async function ruleHits(code: string, relPath: string) {
    const [result] = await eslint.lintText(code, {
      filePath: path.join(appRoot, relPath),
    });
    return result.messages.filter(
      (m: { ruleId: string | null }) =>
        m.ruleId === "local/no-native-text-import",
    );
  }

  it("flags a production component", async () => {
    expect(
      await ruleHits(RN_TEXT, "src/components/Card/Card.tsx"),
    ).toHaveLength(1);
  });

  it.each([
    "src/components/Card/Card.stories.tsx",
    "src/components/Card/__tests__/Card.test.tsx",
    "src/__tests__/screens/Home.test.tsx",
    "src/components/Text/Text.tsx",
  ])("exempts %s", async (relPath) => {
    expect(await ruleHits(RN_TEXT, relPath)).toHaveLength(0);
  });

  it("allows type-only imports", async () => {
    const code =
      'import type { Text } from "react-native";\nimport { View, type Text as T } from "react-native";\nexport type A = typeof Text | typeof T;\nexport const v = View;\n';
    expect(await ruleHits(code, "src/components/Card/Card.tsx")).toHaveLength(
      0,
    );
  });
});
