import { useState, useEffect } from 'react';
import type { Consumer } from '../../types';

interface ConsumerCardProps {
  consumer: Consumer;
}

interface SceneMetadata {
  name: string;
  thumbnail?: string;
  positions: string[];
  loading: boolean;
  error?: string;
}

const CATALYST_URL = 'https://peer.decentraland.org/content';
const WORLDS_URL = 'https://worlds-content-server.decentraland.org';

// Cache for scene metadata to avoid refetching
const sceneMetadataCache = new Map<string, SceneMetadata>();

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
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

interface EntityResponse {
  content?: { file: string; hash: string }[];
  metadata?: {
    display?: {
      title?: string;
      navmapThumbnail?: string;
    };
    scene?: {
      base?: string;
      parcels?: string[];
    };
  };
}

async function fetchSceneData(baseUrl: string, hash: string): Promise<SceneMetadata | null> {
  try {
    const response = await fetch(`${baseUrl}/contents/${hash}`);
    if (!response.ok) {
      return null;
    }

    const entity: EntityResponse = await response.json();

    // Check if this looks like an entity response with metadata
    if (!entity.metadata) {
      return null;
    }

    const metadata = entity.metadata;
    const name = metadata.display?.title || 'Unnamed Scene';

    // Use base parcel for position
    const baseParcel = metadata.scene?.base;
    const positions = baseParcel ? [baseParcel] : [];

    // Find thumbnail from content mapping
    let thumbnail: string | undefined;
    const navmapThumbnail = metadata.display?.navmapThumbnail;
    if (navmapThumbnail && entity.content) {
      const thumbContent = entity.content.find(c => c.file === navmapThumbnail);
      if (thumbContent) {
        thumbnail = `${baseUrl}/contents/${thumbContent.hash}`;
      }
    }

    return {
      name,
      thumbnail,
      positions,
      loading: false,
    };
  } catch {
    return null;
  }
}

async function fetchSceneMetadata(sceneId: string): Promise<SceneMetadata> {
  // Check cache first
  const cached = sceneMetadataCache.get(sceneId);
  if (cached && !cached.loading) {
    return cached;
  }

  // Try Catalyst first (regular scenes)
  let metadata = await fetchSceneData(CATALYST_URL, sceneId);

  // If not found, try Worlds server
  if (!metadata) {
    metadata = await fetchSceneData(WORLDS_URL, sceneId);
  }

  // If still not found, return error
  if (!metadata) {
    const errorMetadata: SceneMetadata = {
      name: 'Unknown',
      positions: [],
      loading: false,
      error: 'Entity not found',
    };
    sceneMetadataCache.set(sceneId, errorMetadata);
    return errorMetadata;
  }

  sceneMetadataCache.set(sceneId, metadata);
  return metadata;
}

export function ConsumerCard({ consumer }: ConsumerCardProps) {
  const [sceneMetadata, setSceneMetadata] = useState<SceneMetadata | null>(null);
  const [copied, setCopied] = useState(false);

  const elapsedTime = consumer.startedAt
    ? Date.now() - new Date(consumer.startedAt).getTime()
    : 0;

  useEffect(() => {
    if (consumer.currentSceneId) {
      // Check cache first
      const cached = sceneMetadataCache.get(consumer.currentSceneId);
      if (cached) {
        setSceneMetadata(cached);
      } else {
        setSceneMetadata({ name: '', positions: [], loading: true });
        fetchSceneMetadata(consumer.currentSceneId).then(setSceneMetadata);
      }
    } else {
      setSceneMetadata(null);
    }
  }, [consumer.currentSceneId]);

  const copySceneId = () => {
    if (consumer.currentSceneId) {
      navigator.clipboard.writeText(consumer.currentSceneId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
          {/* Scene Info Section */}
          <div className="scene-info">
            {sceneMetadata?.thumbnail && (
              <img
                src={sceneMetadata.thumbnail}
                alt={sceneMetadata.name}
                className="scene-thumbnail"
              />
            )}
            <div className="scene-details">
              {sceneMetadata?.loading ? (
                <div className="scene-name loading">Loading...</div>
              ) : (
                <>
                  <div className="scene-name" title={sceneMetadata?.name}>
                    {sceneMetadata?.name || 'Unknown Scene'}
                  </div>
                  {sceneMetadata?.positions && sceneMetadata.positions.length > 0 && (
                    <div className="scene-position">
                      {sceneMetadata.positions.length === 1
                        ? sceneMetadata.positions[0]
                        : `${sceneMetadata.positions[0]} (+${sceneMetadata.positions.length - 1} more)`
                      }
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Scene ID with copy */}
          <div className="scene-id-container">
            <code className="scene-id-full">{consumer.currentSceneId}</code>
            <button
              className="copy-btn"
              onClick={copySceneId}
              title="Copy scene ID"
            >
              {copied ? '✓' : '📋'}
            </button>
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
