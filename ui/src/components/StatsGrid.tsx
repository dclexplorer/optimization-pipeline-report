import type { Stats } from '../types';
import { formatNumber } from '../utils/formatters';

interface StatsGridProps {
  stats: Stats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="stats">
      <div className="stat-card">
        <div className="stat-value">{formatNumber(stats.totalLands)}</div>
        <div className="stat-label">Total Lands</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{formatNumber(stats.occupiedLands)}</div>
        <div className="stat-label">Occupied Lands</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{formatNumber(stats.totalScenes)}</div>
        <div className="stat-label">Total Scenes</div>
      </div>
      <div className="stat-card optimized">
        <div className="stat-value">{formatNumber(stats.scenesWithOptimizedAssets)}</div>
        <div className="stat-label">Optimized Scenes</div>
      </div>
      <div className="stat-card not-optimized">
        <div className="stat-value">{formatNumber(stats.scenesWithoutOptimizedAssets)}</div>
        <div className="stat-label">Not Optimized</div>
      </div>
      <div className="stat-card not-optimized">
        <div className="stat-value">{formatNumber(stats.failedOptimizations)}</div>
        <div className="stat-label">Failed</div>
      </div>
    </div>
  );
}
