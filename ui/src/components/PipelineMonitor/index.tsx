import { useMonitoringData } from '../../hooks/useMonitoringData';
import { QueueStatus } from './QueueStatus';
import { ConsumerCard } from './ConsumerCard';
import { ProcessingHistory } from './ProcessingHistory';

export function PipelineMonitor() {
  const { data, isLoading, error } = useMonitoringData();

  if (isLoading && !data) {
    return (
      <div className="pipeline-monitor">
        <div className="loading">Loading monitoring data...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="pipeline-monitor">
        <div className="error-message">
          Failed to load monitoring data: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pipeline-monitor">
        <div className="no-data">No monitoring data available</div>
      </div>
    );
  }

  const onlineConsumers = data.consumers.filter(c => c.status !== 'offline');
  const offlineConsumers = data.consumers.filter(c => c.status === 'offline');

  return (
    <div className="pipeline-monitor">
      <div className="monitor-header">
        <h2>Pipeline Monitor</h2>
        <span className="refresh-indicator">
          Auto-refreshing every 5s
          {error && <span className="refresh-error"> (last fetch failed)</span>}
        </span>
      </div>

      <QueueStatus queue={data.queue} />

      <div className="consumers-section">
        <h3>Active Consumers ({onlineConsumers.length})</h3>
        {onlineConsumers.length === 0 ? (
          <div className="no-consumers">No active consumers</div>
        ) : (
          <div className="consumers-grid">
            {onlineConsumers.map(consumer => (
              <ConsumerCard key={consumer.id} consumer={consumer} />
            ))}
          </div>
        )}
      </div>

      {offlineConsumers.length > 0 && (
        <div className="consumers-section offline">
          <h3>Offline Consumers ({offlineConsumers.length})</h3>
          <div className="consumers-grid">
            {offlineConsumers.map(consumer => (
              <ConsumerCard key={consumer.id} consumer={consumer} />
            ))}
          </div>
        </div>
      )}

      <ProcessingHistory history={data.recentHistory} />
    </div>
  );
}
