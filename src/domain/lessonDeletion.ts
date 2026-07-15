export interface CleanupSummary { canFinalize: boolean; failureCount: number; }
export function summarizeCleanupResults(results: ReadonlyArray<{ status: 'fulfilled' | 'rejected' }>): CleanupSummary {
  const failureCount = results.filter(result => result.status === 'rejected').length;
  return { canFinalize: failureCount === 0, failureCount };
}
