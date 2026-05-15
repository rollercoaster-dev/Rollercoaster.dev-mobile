/**
 * Pure description-fallback rule used at credential bake time and at diff time.
 * Lives in its own file so credentialDiff can consume it without transitively
 * loading openbadges-core (ESM, breaks under jest's CommonJS path).
 */
export function expectedAchievementDescription(goal: {
  title: string;
  description: string | null;
}): string {
  return goal.description ?? `Achievement: ${goal.title}`;
}
