import { useMemo, useState, useCallback, useRef } from 'react';
import type { QueueHistoryPoint } from '../../types';

export type TimeRange = '24h' | '12h' | '6h' | '3h' | '1h';

interface QueueDepthChartProps {
  history: QueueHistoryPoint[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

const TIME_RANGE_MS: Record<TimeRange, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '3h': 3 * 60 * 60 * 1000,
  '1h': 1 * 60 * 60 * 1000,
};

const TIME_RANGE_TICKS: Record<TimeRange, { count: number; intervalHours: number }> = {
  '24h': { count: 6, intervalHours: 4 },
  '12h': { count: 6, intervalHours: 2 },
  '6h': { count: 6, intervalHours: 1 },
  '3h': { count: 6, intervalHours: 0.5 },
  '1h': { count: 6, intervalHours: 10 / 60 }, // 10 minutes
};

interface TooltipData {
  // SVG coordinates for the highlight circle
  svgX: number;
  svgY: number;
  // Pixel coordinates relative to container for the tooltip div
  pixelX: number;
  pixelY: number;
  depth: number;
  time: string;
}

export function QueueDepthChart({ history, timeRange, onTimeRangeChange }: QueueDepthChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    const now = new Date().getTime();
    const rangeMs = TIME_RANGE_MS[timeRange];
    const startTime = now - rangeMs;

    // Filter history to selected time range
    const filteredHistory = history.filter(h => new Date(h.timestamp).getTime() >= startTime);

    if (filteredHistory.length === 0) return null;

    const width = 800;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxDepth = Math.max(...filteredHistory.map(h => h.queueDepth), 1);

    // Generate path for the area chart - use fixed time range from startTime to now
    const points = filteredHistory.map((point) => {
      const pointTime = new Date(point.timestamp).getTime();
      const x = padding.left + ((pointTime - startTime) / rangeMs) * chartWidth;
      const y = padding.top + chartHeight - (point.queueDepth / maxDepth) * chartHeight;
      return { x, y, depth: point.queueDepth, time: point.timestamp };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
      : '';

    // Generate Y-axis ticks
    const yTicks = [];
    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      const value = Math.round((maxDepth / tickCount) * i);
      const y = padding.top + chartHeight - (value / maxDepth) * chartHeight;
      yTicks.push({ value, y });
    }

    // Generate X-axis ticks based on selected time range
    const xTicks = [];
    const { count } = TIME_RANGE_TICKS[timeRange];
    for (let i = 0; i <= count; i++) {
      const tickTime = new Date(startTime + (i / count) * rangeMs);
      const x = padding.left + (i / count) * chartWidth;
      const label = tickTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      xTicks.push({ x, label });
    }

    return {
      points,
      linePath,
      areaPath,
      yTicks,
      xTicks,
      width,
      height,
      padding,
      chartWidth,
      chartHeight,
      maxDepth,
      startTime,
      rangeMs
    };
  }, [history, timeRange]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartData || !svgRef.current || !containerRef.current) return;

    const svg = svgRef.current;
    const svgRect = svg.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // Calculate mouse position in SVG coordinate space
    const scaleX = chartData.width / svgRect.width;
    const mouseX = (e.clientX - svgRect.left) * scaleX;

    // Find the closest point
    let closestPoint = chartData.points[0];
    let closestDist = Infinity;

    for (const point of chartData.points) {
      const dist = Math.abs(point.x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closestPoint = point;
      }
    }

    // Only show tooltip if mouse is within chart area and close enough to a point
    if (
      mouseX >= chartData.padding.left &&
      mouseX <= chartData.padding.left + chartData.chartWidth &&
      closestDist < 50
    ) {
      // Convert SVG coordinates to pixel position relative to container
      const pointScreenX = svgRect.left + (closestPoint.x / chartData.width) * svgRect.width;
      const pointScreenY = svgRect.top + (closestPoint.y / chartData.height) * svgRect.height;

      setTooltip({
        svgX: closestPoint.x,
        svgY: closestPoint.y,
        pixelX: pointScreenX - containerRect.left,
        pixelY: pointScreenY - containerRect.top,
        depth: closestPoint.depth,
        time: closestPoint.time
      });
    } else {
      setTooltip(null);
    }
  }, [chartData]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const timeRangeOptions: TimeRange[] = ['24h', '12h', '6h', '3h', '1h'];

  if (!chartData || chartData.points.length < 2) {
    return (
      <div className="queue-chart">
        <div className="queue-chart-header">
          <h4>Queue Depth</h4>
          <div className="time-range-selector">
            {timeRangeOptions.map(range => (
              <button
                key={range}
                className={timeRange === range ? 'active' : ''}
                onClick={() => onTimeRangeChange(range)}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <div className="chart-empty">Not enough data to display chart for selected time range</div>
      </div>
    );
  }

  return (
    <div className="queue-chart" ref={containerRef}>
      <div className="queue-chart-header">
        <h4>Queue Depth</h4>
        <div className="time-range-selector">
          {timeRangeOptions.map(range => (
            <button
              key={range}
              className={timeRange === range ? 'active' : ''}
              onClick={() => onTimeRangeChange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${chartData.width} ${chartData.height}`}
        className="queue-depth-svg"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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
          />
        ))}

        {/* Tooltip highlight point */}
        {tooltip && (
          <circle
            cx={tooltip.svgX}
            cy={tooltip.svgY}
            r="6"
            fill="#667eea"
            stroke="#fff"
            strokeWidth="2"
          />
        )}

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

      {/* Tooltip overlay */}
      {tooltip && (
        <div
          className="chart-tooltip"
          style={{
            left: `${tooltip.pixelX}px`,
            top: `${tooltip.pixelY}px`
          }}
        >
          <div className="tooltip-value">{tooltip.depth.toLocaleString()} items</div>
          <div className="tooltip-time">{new Date(tooltip.time).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}
