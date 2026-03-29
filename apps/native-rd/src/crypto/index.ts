export type { KeyProvider } from "./KeyProvider";
export { SecureStoreKeyProvider } from "./SecureStoreKeyProvider";
import { SecureStoreKeyProvider } from "./SecureStoreKeyProvider";

/** Singleton instance used by the app */
export const keyProvider = new SecureStoreKeyProvider();
