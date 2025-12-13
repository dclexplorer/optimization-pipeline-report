import type { Consumer } from '../../types';

interface ConsumerCardProps {
  consumer: Consumer;
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
  return `${diffHour}h ago`;
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'processing': return 'status-processing';
    case 'idle': return 'status-idle';
    case 'offline': return 'status-offline';
    default: return '';
  }
}

function truncateId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

export function ConsumerCard({ consumer }: ConsumerCardProps) {
  const elapsedTime = consumer.startedAt
    ? Date.now() - new Date(consumer.startedAt).getTime()
    : 0;

  return (
    <div className={`consumer-card ${getStatusClass(consumer.status)}`}>
      <div className="consumer-header">
        <span className="consumer-id" title={consumer.id}>
          {truncateId(consumer.id)}
        </span>
        <span className={`consumer-status ${getStatusClass(consumer.status)}`}>
          {consumer.status}
        </span>
      </div>

      <div className="consumer-method">{consumer.processMethod}</div>

      {consumer.status === 'processing' && consumer.currentSceneId && (
        <div className="consumer-current">
          <div className="current-scene" title={consumer.currentSceneId}>
            {consumer.currentSceneId.length > 20
              ? `${consumer.currentSceneId.slice(0, 17)}...`
              : consumer.currentSceneId}
          </div>
          {consumer.currentStep && (
            <div className="current-step">{consumer.currentStep}</div>
          )}
          {consumer.progressPercent !== undefined && consumer.progressPercent > 0 && (
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${consumer.progressPercent}%` }}
              />
              <span className="progress-text">{consumer.progressPercent}%</span>
            </div>
          )}
          {elapsedTime > 0 && (
            <div className="elapsed-time">
              Running for {formatDuration(elapsedTime)}
            </div>
          )}
        </div>
      )}

      <div className="consumer-stats">
        <div className="stat">
          <span className="stat-label">Completed:</span>
          <span className="stat-value success">{consumer.jobsCompleted}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Failed:</span>
          <span className="stat-value failed">{consumer.jobsFailed}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Avg Time:</span>
          <span className="stat-value">
            {consumer.avgProcessingTimeMs > 0
              ? formatDuration(consumer.avgProcessingTimeMs)
              : '-'}
          </span>
        </div>
      </div>

      <div className="consumer-footer">
        <span className="last-heartbeat">
          Last seen: {formatTimeAgo(consumer.lastHeartbeat)}
        </span>
      </div>
    </div>
  );
}
