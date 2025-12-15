import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { QueueHistoryPoint } from '../../types';

export type TimeRange = '7d' | '3d' | '24h' | '12h' | '6h' | '3h' | '1h';

interface QueueDepthChartProps {
  history: QueueHistoryPoint[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

const TIME_RANGE_MS: Record<TimeRange, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '3h': 3 * 60 * 60 * 1000,
  '1h': 1 * 60 * 60 * 1000,
};

function formatTime(timestamp: string, showDate: boolean): string {
  const date = new Date(timestamp);
  if (showDate) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTooltipTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

export function QueueDepthChart({ history, timeRange, onTimeRangeChange }: QueueDepthChartProps) {
  const timeRangeOptions: TimeRange[] = ['7d', '3d', '24h', '12h', '6h', '3h', '1h'];

  const filteredData = useMemo(() => {
    const now = Date.now();
    const rangeMs = TIME_RANGE_MS[timeRange];
    const startTime = now - rangeMs;
    const showDate = timeRange === '7d' || timeRange === '3d';

    return history
      .filter(h => new Date(h.timestamp).getTime() >= startTime)
      .map(h => ({
        ...h,
        time: new Date(h.timestamp).getTime(),
        formattedTime: formatTime(h.timestamp, showDate),
      }));
  }, [history, timeRange]);

  const renderHeader = () => (
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
  );

  if (filteredData.length < 2) {
    return (
      <div className="queue-chart">
        {renderHeader()}
        <div className="chart-empty">Not enough data to display chart for selected time range</div>
      </div>
    );
  }

  return (
    <div className="queue-chart">
      {renderHeader()}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={filteredData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="queueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#764ba2" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis
            dataKey="formattedTime"
            tick={{ fontSize: 11, fill: '#6c757d' }}
            tickLine={{ stroke: '#6c757d' }}
            axisLine={{ stroke: '#6c757d' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6c757d' }}
            tickLine={{ stroke: '#6c757d' }}
            axisLine={{ stroke: '#6c757d' }}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 12px',
            }}
            labelStyle={{ color: 'white', opacity: 0.8, fontSize: '0.9em' }}
            itemStyle={{ color: 'white', fontWeight: 'bold' }}
            formatter={(value: number) => [`${value.toLocaleString()} items`, 'Queue Depth']}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                return formatTooltipTime(payload[0].payload.timestamp);
              }
              return label;
            }}
          />
          <Area
            type="monotone"
            dataKey="queueDepth"
            stroke="#667eea"
            strokeWidth={2}
            fill="url(#queueGradient)"
            dot={filteredData.length <= 50}
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
