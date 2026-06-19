export function getScoreClass(score: number | null | undefined): string {
  if (score === null || score === undefined) return "text-muted-foreground";
  if (score >= 85) return "text-green-600 font-semibold";
  if (score >= 60) return "text-yellow-600 font-semibold";
  return "text-red-600 font-semibold";
}
