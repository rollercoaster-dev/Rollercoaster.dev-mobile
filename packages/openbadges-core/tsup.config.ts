import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  clean: true,
  // See `packages/openbadges-types/tsup.config.ts` for why these flags exist:
  // `composite: false` overrides the package tsconfig's project-references
  // setting, and `ignoreDeprecations: "6.0"` silences TS 6's promotion of
  // tsup's internally-injected `baseUrl` to a hard error.
  dts: {
    compilerOptions: {
      composite: false,
      ignoreDeprecations: "6.0",
    },
  },
  format: ["cjs", "esm"],
  sourcemap: true,
  outDir: "dist",
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".js",
      dts: format === "cjs" ? ".d.cts" : ".d.ts",
    };
  },
});
