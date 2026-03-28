export function isAvailableAsync(): Promise<boolean> {
  return Promise.resolve(true);
}

export function shareAsync(
  _url: string,
  _options?: Record<string, string>,
): Promise<void> {
  return Promise.resolve();
}
