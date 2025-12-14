import { useState, useEffect } from 'react';
import type { RankingEntry } from '../types';
import { ReportModal } from './ReportModal';
import { API_BASE_URL } from '../config';

interface SceneMetadata {
  name: string;
  thumbnail?: string;
  positions: string[];
  loading: boolean;
  isWorld?: boolean;
  worldName?: string;
}

const CATALYST_URL = 'https://peer.decentraland.org/content';
const WORLDS_URL = 'https://worlds-content-server.decentraland.org';

// Shared cache for scene metadata
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
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
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
    };
    worldConfiguration?: {
      name?: string;
    };
  };
}

async function fetchSceneData(baseUrl: string, hash: string, isWorld: boolean = false): Promise<SceneMetadata | null> {
  try {
    const response = await fetch(`${baseUrl}/contents/${hash}`);
    if (!response.ok) return null;

    const entity: EntityResponse = await response.json();
    if (!entity.metadata) return null;

    const metadata = entity.metadata;
    const name = metadata.display?.title || 'Unnamed Scene';
    const baseParcel = metadata.scene?.base;
    const positions = baseParcel ? [baseParcel] : [];
    const worldName = metadata.worldConfiguration?.name;

    let thumbnail: string | undefined;
    const navmapThumbnail = metadata.display?.navmapThumbnail;
    if (navmapThumbnail && entity.content) {
      const thumbContent = entity.content.find(c => c.file === navmapThumbnail);
      if (thumbContent) {
        thumbnail = `${baseUrl}/contents/${thumbContent.hash}`;
      }
    }

    return { name, thumbnail, positions, loading: false, isWorld, worldName };
  } catch {
    return null;
  }
}

async function fetchSceneMetadata(sceneId: string): Promise<SceneMetadata> {
  const cached = sceneMetadataCache.get(sceneId);
  if (cached && !cached.loading) return cached;

  let metadata = await fetchSceneData(CATALYST_URL, sceneId, false);
  if (!metadata) {
    metadata = await fetchSceneData(WORLDS_URL, sceneId, true);
  }

  if (!metadata) {
    const errorMetadata: SceneMetadata = {
      name: 'Unknown',
      positions: [],
      loading: false,
    };
    sceneMetadataCache.set(sceneId, errorMetadata);
    return errorMetadata;
  }

  sceneMetadataCache.set(sceneId, metadata);
  return metadata;
}

interface RankingCardProps {
  entry: RankingEntry;
  onViewReport: () => void;
}

function RankingCard({ entry, onViewReport }: RankingCardProps) {
  const [metadata, setMetadata] = useState<SceneMetadata | null>(null);

  useEffect(() => {
    const cached = sceneMetadataCache.get(entry.sceneId);
    if (cached) {
      setMetadata(cached);
    } else {
      setMetadata({ name: '', positions: [], loading: true });
      fetchSceneMetadata(entry.sceneId).then(setMetadata);
    }
  }, [entry.sceneId]);

  return (
    <div className="history-card ranking">
      <div className="history-card-header">
        <span className="ranking-badge">#{entry.rank}</span>
        <span className="history-time">{formatTimeAgo(entry.completedAt)}</span>
      </div>

      <div className="history-scene-info">
        {metadata?.thumbnail ? (
          <img
            src={metadata.thumbnail}
            alt={metadata.name}
            className="history-thumbnail"
          />
        ) : (
          <div className="history-thumbnail-placeholder" />
        )}
        <div className="history-scene-details">
          {metadata?.loading ? (
            <div className="history-scene-name loading">Loading...</div>
          ) : (
            <>
              <div className="history-scene-name" title={metadata?.name}>
                {metadata?.name || 'Unknown Scene'}
              </div>
              {metadata?.isWorld && metadata?.worldName ? (
                <div className="history-world-name">🌐 {metadata.worldName}</div>
              ) : (
                metadata?.positions && metadata.positions.length > 0 && (
                  <div className="history-position">{metadata.positions[0]}</div>
                )
              )}
            </>
          )}
        </div>
      </div>

      <div className="history-scene-id">
        <code>{entry.sceneId}</code>
      </div>

      <div className="history-card-footer">
        <span className="history-duration ranking-duration">{formatDuration(entry.durationMs)}</span>
        <button className="history-view-report-btn" onClick={onViewReport}>
          View Report
        </button>
      </div>
    </div>
  );
}

export function RankingView() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRanking() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/monitoring/ranking`);
        if (!response.ok) {
          throw new Error('Failed to fetch ranking');
        }
        const data = await response.json();
        setRanking(data.ranking || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchRanking();
  }, []);

  if (loading) {
    return (
      <div className="ranking-view">
        <h3>Slowest Processing Scenes (Top 20)</h3>
        <div className="ranking-loading">Loading ranking data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ranking-view">
        <h3>Slowest Processing Scenes (Top 20)</h3>
        <div className="ranking-error">Error: {error}</div>
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className="ranking-view">
        <h3>Slowest Processing Scenes (Top 20)</h3>
        <div className="no-ranking">No ranking data available</div>
      </div>
    );
  }

  return (
    <div className="ranking-view">
      <h3>Slowest Processing Scenes (Top 20)</h3>
      <div className="history-grid">
        {ranking.map((entry) => (
          <RankingCard
            key={`${entry.sceneId}-${entry.completedAt}`}
            entry={entry}
            onViewReport={() => setSelectedSceneId(entry.sceneId)}
          />
        ))}
      </div>

      {selectedSceneId && (
        <ReportModal
          sceneId={selectedSceneId}
          onClose={() => setSelectedSceneId(null)}
        />
      )}
    </div>
  );
}
