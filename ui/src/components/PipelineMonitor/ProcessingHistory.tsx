import type { ProcessingHistoryEntry } from '../../types';

interface ProcessingHistoryProps {
  history: ProcessingHistoryEntry[];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remainingSec = sec % 60;
  if (min < 60) return `${min}m ${remainingSec}s`;
  const hour = Math.floor(min / 60);
  const remainingMin = min % 60;
  return `${hour}h ${remainingMin}m`;
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

function truncateId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

export function ProcessingHistory({ history }: ProcessingHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="processing-history">
        <h3>Recent Processing History</h3>
        <div className="no-history">No processing history available</div>
      </div>
    );
  }

  return (
    <div className="processing-history">
      <h3>Recent Processing History ({history.length})</h3>
      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Scene ID</th>
              <th>Method</th>
              <th>Consumer</th>
              <th>Duration</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry, index) => (
              <tr key={`${entry.sceneId}-${entry.completedAt}-${index}`} className={`status-${entry.status}`}>
                <td>
                  <span className={`status-badge ${entry.status}`}>
                    {entry.status === 'success' ? '✓' : '✗'}
                  </span>
                </td>
                <td className="scene-id" title={entry.sceneId}>
                  {entry.sceneId.length > 24
                    ? `${entry.sceneId.slice(0, 21)}...`
                    : entry.sceneId}
                </td>
                <td>{entry.processMethod}</td>
                <td title={entry.consumerId}>{truncateId(entry.consumerId)}</td>
                <td>{formatDuration(entry.durationMs)}</td>
                <td>{formatTimeAgo(entry.completedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
