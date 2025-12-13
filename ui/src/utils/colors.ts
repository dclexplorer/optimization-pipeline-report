// Generate colors using golden angle for optimal distribution
export function getColorForSceneIndex(index: number): string {
  const hue = (index * 137.5) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

export const COLORS = {
  empty: '#1a1a1a',
  optimized: '#10b981',
  failed: '#f59e0b',
  notOptimized: '#ef4444',
  reportSuccess: '#3b82f6',
  noReport: '#6b7280',
} as const;
