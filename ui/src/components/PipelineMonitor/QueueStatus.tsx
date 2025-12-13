import type { QueueMetrics } from '../../types';

interface QueueStatusProps {
  queue: QueueMetrics | null;
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${diffHour}h ago`;
}

export function QueueStatus({ queue }: QueueStatusProps) {
  if (!queue) {
    return (
      <div className="queue-status">
        <h3>Queue Status</h3>
        <div className="queue-unavailable">
          No queue data available. Producer may not be reporting metrics.
        </div>
      </div>
    );
  }

  return (
    <div className="queue-status">
      <h3>Queue Status</h3>
      <div className="queue-stats">
        <div className="queue-stat">
          <div className="stat-value">{queue.queueDepth.toLocaleString()}</div>
          <div className="stat-label">Queue Depth</div>
        </div>
        <div className="queue-stat">
          <div className="stat-value">{formatTimeAgo(queue.lastUpdated)}</div>
          <div className="stat-label">Last Update</div>
        </div>
      </div>
    </div>
  );
}
