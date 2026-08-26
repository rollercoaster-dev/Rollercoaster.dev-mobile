/**
 * LESSON 03 checks. Run: bun test tests/03-lexicon.test.ts
 *
 * You are writing a Lexicon schema by hand, as JSON, at
 * `lexicons/dev.rollercoaster.badge.credential.json`.
 *
 * These checks are deliberately loose about your descriptions and strict about the
 * structure. A Lexicon is a contract other people's software reads — the structure is
 * the part that has to be right.
 *
 * Spec: https://atproto.com/specs/lexicon
 */

import { describe, expect, test } from "bun:test";

const PATH = new URL(
  "../lexicons/dev.rollercoaster.badge.credential.json",
  import.meta.url,
).pathname;

async function readLexicon(): Promise<Record<string, any>> {
  const file = Bun.file(PATH);
  if (!(await file.exists())) {
    throw new Error(
      `No lexicon at lexicons/dev.rollercoaster.badge.credential.json — see lessons/03-lexicons-and-records.md`,
    );
  }
  return file.json();
}

describe("the lexicon document", () => {
  test("exists and is valid JSON", async () => {
    await expect(readLexicon()).resolves.toBeObject();
  });

  test("declares lexicon version 1", async () => {
    expect((await readLexicon()).lexicon).toBe(1);
  });

  test("its id matches the NSID, which matches the filename", async () => {
    // An NSID is reverse-domain-name. `dev.rollercoaster` is the authority half and it
    // has to be a domain you control — lesson 03 covers what claiming one commits you to.
    expect((await readLexicon()).id).toBe("dev.rollercoaster.badge.credential");
  });
});

describe("the main definition", () => {
  test("is a record, not a query or a procedure", async () => {
    expect((await readLexicon()).defs?.main?.type).toBe("record");
  });

  test("declares a record key strategy", async () => {
    // `tid`, `nsid`, `literal:<value>`, or `any`. Lesson 03 on why `tid` is the
    // usual answer and what picking `literal:self` would mean instead.
    expect((await readLexicon()).defs.main.key).toBeString();
  });

  test("the record is an object with properties", async () => {
    const record = (await readLexicon()).defs.main.record;
    expect(record.type).toBe("object");
    expect(record.properties).toBeObject();
  });
});

describe("the fields", () => {
  test("carries the credential as a string, not a nested object", async () => {
    // Two reasons, both in lesson 03. One is that '@context' cannot be expressed in a
    // Lexicon object schema. The other is more important and is about signatures.
    const props = (await readLexicon()).defs.main.record.properties;
    expect(props.credential?.type).toBe("string");
  });

  test("denormalizes the issuer DID for indexing", async () => {
    const props = (await readLexicon()).defs.main.record.properties;
    expect(props.issuerDid?.type).toBe("string");
  });

  test("has a createdAt with the datetime format", async () => {
    const props = (await readLexicon()).defs.main.record.properties;
    expect(props.createdAt?.type).toBe("string");
    expect(props.createdAt?.format).toBe("datetime");
  });

  test("requires credential, issuerDid and createdAt", async () => {
    const required = (await readLexicon()).defs.main.record.required;
    expect(required).toBeArray();
    expect(required).toContain("credential");
    expect(required).toContain("issuerDid");
    expect(required).toContain("createdAt");
  });

  test("bounds the credential string", async () => {
    // Unbounded strings in a public schema are how you get a repo full of junk.
    const props = (await readLexicon()).defs.main.record.properties;
    expect(props.credential.maxLength).toBeNumber();
  });
});
