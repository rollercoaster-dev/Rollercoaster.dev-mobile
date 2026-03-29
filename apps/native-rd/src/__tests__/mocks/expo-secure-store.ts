/**
 * Mock for expo-secure-store
 *
 * Stubs the native Keychain/Keystore wrapper. getItemAsync returns null
 * (no stored value) by default; tests can override via mockResolvedValue.
 */
export const getItemAsync = jest.fn().mockResolvedValue(null);
export const setItemAsync = jest.fn().mockResolvedValue(undefined);
export const deleteItemAsync = jest.fn().mockResolvedValue(undefined);
