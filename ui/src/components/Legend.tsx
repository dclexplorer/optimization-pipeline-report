import type { MapView } from '../types';
import { COLORS } from '../utils/colors';

interface LegendProps {
  view: MapView;
}

const legendItems: Record<MapView, { color: string; label: string; isGradient?: boolean }[]> = {
  scenes: [
    { color: COLORS.empty, label: 'Empty Land' },
    { color: 'linear-gradient(45deg, #667eea, #764ba2)', label: 'Occupied by Scene', isGradient: true },
  ],
  optimization: [
    { color: COLORS.empty, label: 'Empty Land' },
    { color: COLORS.optimized, label: 'Optimized' },
    { color: COLORS.failed, label: 'Has Report (Failed)' },
    { color: COLORS.notOptimized, label: 'Not Optimized' },
  ],
  reports: [
    { color: COLORS.empty, label: 'Empty Land' },
    { color: COLORS.optimized, label: 'Optimized' },
    { color: COLORS.reportSuccess, label: 'Report (Success)' },
    { color: COLORS.failed, label: 'Report (Failed)' },
    { color: COLORS.noReport, label: 'No Report' },
  ],
};

export function Legend({ view }: LegendProps) {
  const items = legendItems[view];

  return (
    <div className="legend">
      {items.map((item) => (
        <div key={item.label} className="legend-item">
          <div
            className="legend-color"
            style={{ background: item.color }}
          />
          <span className="legend-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
