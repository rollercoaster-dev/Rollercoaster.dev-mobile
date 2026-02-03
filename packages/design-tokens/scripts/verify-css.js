#!/usr/bin/env node
/**
 * Verify that generated CSS matches the original tokens.css
 *
 * This script compares the generated tokens with the original CSS
 * to ensure backward compatibility.
 */
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Extract CSS custom properties from a CSS string
function extractCSSProperties(css) {
  const properties = new Map();
  const regex = /--([\w-]+):\s*([^;]+);/g;
  let match;

  while ((match = regex.exec(css)) !== null) {
    const name = match[1];
    const value = match[2].trim();
    properties.set(name, value);
  }

  return properties;
}

// Compare two maps of CSS properties
function compareCSSProperties(generated, original) {
  const missing = [];
  const different = [];
  const extra = [];

  // Check for missing or different properties
  for (const [name, value] of original) {
    if (!generated.has(name)) {
      missing.push(name);
    } else if (generated.get(name) !== value) {
      different.push({
        name,
        generated: generated.get(name),
        original: value,
      });
    }
  }

  // Check for extra properties
  for (const name of generated.keys()) {
    if (!original.has(name)) {
      extra.push(name);
    }
  }

  return { missing, different, extra };
}

async function main() {
  const generatedPath = join(__dirname, "../build/css/tokens.css");
  const originalPath = join(
    __dirname,
    "../../openbadges-ui/src/styles/tokens.css",
  );

  let generatedCSS, originalCSS;

  try {
    generatedCSS = await readFile(generatedPath, "utf-8");
  } catch {
    console.error(
      "❌ Generated tokens.css not found. Run `npm run build` first.",
    );
    process.exit(1);
  }

  try {
    originalCSS = await readFile(originalPath, "utf-8");
  } catch {
    console.error("⚠️  Original tokens.css not found at expected path.");
    console.error("   This is OK if you are starting fresh.");
    console.log(
      "\n✅ Verification skipped - no original file to compare against.",
    );
    process.exit(0);
  }

  const generated = extractCSSProperties(generatedCSS);
  const original = extractCSSProperties(originalCSS);

  console.log(`\nGenerated: ${generated.size} properties`);
  console.log(`Original:  ${original.size} properties\n`);

  const { missing, different, extra } = compareCSSProperties(
    generated,
    original,
  );

  if (missing.length > 0) {
    console.log("❌ Missing properties:");
    missing.forEach((name) => console.log(`   --${name}`));
  }

  if (different.length > 0) {
    console.log("\n⚠️  Different values:");
    different.forEach(({ name, generated, original }) => {
      console.log(`   --${name}`);
      console.log(`     generated: ${generated}`);
      console.log(`     original:  ${original}`);
    });
  }

  if (extra.length > 0) {
    console.log("\n📝 Extra properties (not in original):");
    extra.forEach((name) => console.log(`   --${name}`));
  }

  if (missing.length === 0 && different.length === 0) {
    console.log("✅ All original properties are present with matching values!");

    if (extra.length > 0) {
      console.log(`   (${extra.length} additional properties added)`);
    }

    process.exit(0);
  } else {
    console.log(
      `\n❌ Verification failed: ${missing.length} missing, ${different.length} different`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
