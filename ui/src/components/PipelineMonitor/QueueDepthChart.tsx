import { useMemo } from 'react';
import type { QueueHistoryPoint } from '../../types';

interface QueueDepthChartProps {
  history: QueueHistoryPoint[];
}

export function QueueDepthChart({ history }: QueueDepthChartProps) {
  const chartData = useMemo(() => {
    if (history.length === 0) return null;

    const width = 800;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxDepth = Math.max(...history.map(h => h.queueDepth), 1);
    const minTime = new Date(history[0].timestamp).getTime();
    const maxTime = new Date(history[history.length - 1].timestamp).getTime();
    const timeRange = maxTime - minTime || 1;

    // Generate path for the area chart
    const points = history.map((point) => {
      const x = padding.left + ((new Date(point.timestamp).getTime() - minTime) / timeRange) * chartWidth;
      const y = padding.top + chartHeight - (point.queueDepth / maxDepth) * chartHeight;
      return { x, y, depth: point.queueDepth, time: point.timestamp };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

    // Generate Y-axis ticks
    const yTicks = [];
    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      const value = Math.round((maxDepth / tickCount) * i);
      const y = padding.top + chartHeight - (value / maxDepth) * chartHeight;
      yTicks.push({ value, y });
    }

    // Generate X-axis ticks (every 4 hours)
    const xTicks = [];
    const now = new Date();
    for (let i = 0; i <= 6; i++) {
      const time = new Date(now.getTime() - (24 - i * 4) * 60 * 60 * 1000);
      const x = padding.left + (i / 6) * chartWidth;
      const label = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      xTicks.push({ x, label });
    }

    return { points, linePath, areaPath, yTicks, xTicks, width, height, padding, chartWidth, chartHeight, maxDepth };
  }, [history]);

  if (!chartData || history.length < 2) {
    return (
      <div className="queue-chart">
        <h4>Queue Depth (Last 24h)</h4>
        <div className="chart-empty">Not enough data to display chart</div>
      </div>
    );
  }

  return (
    <div className="queue-chart">
      <h4>Queue Depth (Last 24h)</h4>
      <svg
        viewBox={`0 0 ${chartData.width} ${chartData.height}`}
        className="queue-depth-svg"
      >
        {/* Grid lines */}
        {chartData.yTicks.map((tick, i) => (
          <line
            key={i}
            x1={chartData.padding.left}
            y1={tick.y}
            x2={chartData.padding.left + chartData.chartWidth}
            y2={tick.y}
            stroke="#e9ecef"
            strokeDasharray="4,4"
          />
        ))}

        {/* Area fill */}
        <path
          d={chartData.areaPath}
          fill="url(#queueGradient)"
          opacity="0.3"
        />

        {/* Line */}
        <path
          d={chartData.linePath}
          fill="none"
          stroke="#667eea"
          strokeWidth="2"
        />

        {/* Data points (only show if not too many) */}
        {chartData.points.length <= 50 && chartData.points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="#667eea"
          >
            <title>{`${point.depth} items at ${new Date(point.time).toLocaleString()}`}</title>
          </circle>
        ))}

        {/* Y-axis */}
        <line
          x1={chartData.padding.left}
          y1={chartData.padding.top}
          x2={chartData.padding.left}
          y2={chartData.padding.top + chartData.chartHeight}
          stroke="#6c757d"
        />

        {/* Y-axis ticks and labels */}
        {chartData.yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={chartData.padding.left - 5}
              y1={tick.y}
              x2={chartData.padding.left}
              y2={tick.y}
              stroke="#6c757d"
            />
            <text
              x={chartData.padding.left - 10}
              y={tick.y + 4}
              textAnchor="end"
              fontSize="11"
              fill="#6c757d"
            >
              {tick.value.toLocaleString()}
            </text>
          </g>
        ))}

        {/* X-axis */}
        <line
          x1={chartData.padding.left}
          y1={chartData.padding.top + chartData.chartHeight}
          x2={chartData.padding.left + chartData.chartWidth}
          y2={chartData.padding.top + chartData.chartHeight}
          stroke="#6c757d"
        />

        {/* X-axis ticks and labels */}
        {chartData.xTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={tick.x}
              y1={chartData.padding.top + chartData.chartHeight}
              x2={tick.x}
              y2={chartData.padding.top + chartData.chartHeight + 5}
              stroke="#6c757d"
            />
            <text
              x={tick.x}
              y={chartData.padding.top + chartData.chartHeight + 20}
              textAnchor="middle"
              fontSize="11"
              fill="#6c757d"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="queueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="100%" stopColor="#764ba2" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
