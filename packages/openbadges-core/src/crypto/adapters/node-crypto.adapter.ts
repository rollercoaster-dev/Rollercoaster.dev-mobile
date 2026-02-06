/**
 * Default CryptoProvider for Node.js and Bun environments.
 *
 * Delegates all operations to the jose library (pure JS, Web Crypto-based).
 * This adapter is auto-configured when running in Node.js or Bun,
 * so server consumers need zero configuration.
 */

import type { JWK } from "jose";
import {
  CompactSign,
  compactVerify,
  importJWK,
  generateKeyPair,
  exportJWK,
} from "jose";
import type { CryptoProvider } from "./types.js";

export class NodeCryptoAdapter implements CryptoProvider {
  async sign(
    data: string,
    privateKey: JWK,
    algorithm: string,
  ): Promise<string> {
    const key = await importJWK(privateKey, algorithm);
    return new CompactSign(new TextEncoder().encode(data))
      .setProtectedHeader({ alg: algorithm })
      .sign(key);
  }

  async verify(
    data: string,
    signature: string,
    publicKey: JWK,
    algorithm: string,
  ): Promise<boolean> {
    // Key import errors (bad format, unsupported algorithm) must propagate.
    const key = await importJWK(publicKey, algorithm);

    try {
      const { payload } = await compactVerify(signature, key);
      return new TextDecoder().decode(payload) === data;
    } catch {
      // Only verification failures (invalid/tampered signatures) return false.
      return false;
    }
  }

  async generateKeyPair(
    algorithm: "Ed25519" | "RSA",
  ): Promise<{ publicKey: JWK; privateKey: JWK }> {
    const alg = algorithm === "Ed25519" ? "EdDSA" : "RS256";
    const options =
      algorithm === "Ed25519"
        ? { crv: "Ed25519" as const, extractable: true }
        : { modulusLength: 2048, extractable: true };

    const { publicKey, privateKey } = await generateKeyPair(alg, options);
    return {
      publicKey: await exportJWK(publicKey),
      privateKey: await exportJWK(privateKey),
    };
  }
}
