import { useHistoryData } from '../hooks/useHistoryData';
import { formatNumber, formatPercentage, formatDate } from '../utils/formatters';

export function HistoryView() {
  const { data, isLoading, error } = useHistoryData();

  if (isLoading) {
    return <div className="loading">Loading history...</div>;
  }

  if (error) {
    return <div className="error-message">Failed to load history: {error}</div>;
  }

  if (data.length === 0) {
    return <div className="loading">No history data available</div>;
  }

  return (
    <div className="history-view">
      <h2 className="map-title">Optimization History (Last 30 Days)</h2>

      <div className="history-chart">
        <svg viewBox="0 0 800 200" className="chart-svg">
          {data.length > 1 && (
            <>
              {/* Chart background */}
              <rect x="50" y="10" width="740" height="160" fill="#f8f9fa" rx="4" />

              {/* Y-axis labels */}
              <text x="45" y="20" textAnchor="end" fontSize="10" fill="#6c757d">100%</text>
              <text x="45" y="90" textAnchor="end" fontSize="10" fill="#6c757d">50%</text>
              <text x="45" y="165" textAnchor="end" fontSize="10" fill="#6c757d">0%</text>

              {/* Line chart */}
              <polyline
                fill="none"
                stroke="#667eea"
                strokeWidth="2"
                points={data
                  .slice()
                  .reverse()
                  .map((entry, i, arr) => {
                    const x = 50 + (i / (arr.length - 1)) * 740;
                    const y = 170 - (entry.optimization_percentage / 100) * 160;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />

              {/* Data points */}
              {data
                .slice()
                .reverse()
                .map((entry, i, arr) => {
                  const x = 50 + (i / (arr.length - 1)) * 740;
                  const y = 170 - (entry.optimization_percentage / 100) * 160;
                  return (
                    <circle
                      key={entry.id}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#667eea"
                    />
                  );
                })}
            </>
          )}
        </svg>
      </div>

      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Occupied Lands</th>
              <th>Total Scenes</th>
              <th>Optimized</th>
              <th>Not Optimized</th>
              <th>Coverage</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr key={entry.id}>
                <td>{formatDate(entry.created_at)}</td>
                <td>{formatNumber(entry.occupied_lands)}</td>
                <td>{formatNumber(entry.total_scenes)}</td>
                <td className="optimized">{formatNumber(entry.scenes_with_optimized)}</td>
                <td className="not-optimized">{formatNumber(entry.scenes_without_optimized)}</td>
                <td>{formatPercentage(entry.optimization_percentage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
