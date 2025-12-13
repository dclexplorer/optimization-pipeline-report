import type { Stats } from '../types';
import { formatNumber, formatPercentage } from '../utils/formatters';

interface StatsGridProps {
  stats: Stats;
  variant?: 'overview' | 'optimization';
}

export function StatsGrid({ stats, variant = 'overview' }: StatsGridProps) {
  if (variant === 'optimization') {
    return (
      <div className="stats">
        <div className="stat-card optimized">
          <div className="stat-value">{formatNumber(stats.scenesWithOptimizedAssets)}</div>
          <div className="stat-label">Scenes with Optimized Assets</div>
        </div>
        <div className="stat-card not-optimized">
          <div className="stat-value">{formatNumber(stats.scenesWithoutOptimizedAssets)}</div>
          <div className="stat-label">Scenes without Optimized Assets</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{formatNumber(stats.scenesWithReports)}</div>
          <div className="stat-label">Scenes with Reports</div>
        </div>
        <div className="stat-card info">
          <div className="stat-value">{formatNumber(stats.successfulOptimizations)}</div>
          <div className="stat-label">Successful Optimizations</div>
        </div>
        <div className="stat-card not-optimized">
          <div className="stat-value">{formatNumber(stats.failedOptimizations)}</div>
          <div className="stat-label">Failed Optimizations</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatPercentage(stats.optimizationPercentage)}</div>
          <div className="stat-label">Optimization Coverage</div>
        </div>
      </div>
    );
  }

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
        <div className="stat-value">{formatNumber(stats.emptyLands)}</div>
        <div className="stat-label">Empty Lands</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{formatNumber(stats.totalScenes)}</div>
        <div className="stat-label">Total Scenes</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.averageLandsPerScene.toFixed(2)}</div>
        <div className="stat-label">Avg Lands/Scene</div>
      </div>
    </div>
  );
}
