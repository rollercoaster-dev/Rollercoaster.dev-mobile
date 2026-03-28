export function formatEvidenceLabel(count: number): string {
  if (count === 0) return '+ add evidence';
  return `${count} item${count !== 1 ? 's' : ''}`;
}
