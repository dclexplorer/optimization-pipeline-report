import { useState, useEffect } from 'react';
import type { WorldWithOptimization, LandData } from '../types';
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

interface FailingViewProps {
  worlds: WorldWithOptimization[];
  lands: LandData[];
}

// Get unique failed scenes from lands
function getFailedScenes(lands: LandData[]): { sceneId: string; positions: string[] }[] {
  const sceneMap = new Map<string, string[]>();

  for (const land of lands) {
    if (!land.sceneId) continue;
    // Check if the scene has a failed optimization report
    if (land.optimizationReport && !land.optimizationReport.success) {
      const positions = sceneMap.get(land.sceneId) || [];
      positions.push(`${land.x},${land.y}`);
      sceneMap.set(land.sceneId, positions);
    }
  }

  return Array.from(sceneMap.entries()).map(([sceneId, positions]) => ({
    sceneId,
    positions,
  }));
}

interface FailedSceneCardProps {
  sceneId: string;
  positions: string[];
  onViewReport: () => void;
}

function FailedSceneCard({ sceneId, positions, onViewReport }: FailedSceneCardProps) {
  const [metadata, setMetadata] = useState<SceneMetadata | null>(null);

  useEffect(() => {
    const cached = sceneMetadataCache.get(sceneId);
    if (cached) {
      setMetadata(cached);
    } else {
      setMetadata({ name: '', positions: [], loading: true });
      fetchSceneMetadata(sceneId).then(setMetadata);
    }
  }, [sceneId]);

  return (
    <div className="history-card failed">
      <div className="history-card-header">
        <span className="failed-badge">FAILED</span>
        <span className="history-method">Scene</span>
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
              {positions.length > 0 && (
                <div className="history-position">
                  {positions.slice(0, 3).join(', ')}
                  {positions.length > 3 && ` +${positions.length - 3} more`}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="history-scene-id">
        <code>{sceneId}</code>
      </div>

      <div className="history-card-footer">
        <button className="history-view-report-btn" onClick={onViewReport}>
          View Report
        </button>
      </div>
    </div>
  );
}

interface FailedWorldCardProps {
  world: WorldWithOptimization;
  onViewReport: () => void;
}

function FailedWorldCard({ world, onViewReport }: FailedWorldCardProps) {
  return (
    <div className="history-card failed">
      <div className="history-card-header">
        <span className="failed-badge">FAILED</span>
        <span className="history-method">World</span>
      </div>

      <div className="history-scene-info">
        {world.thumbnail ? (
          <img
            src={world.thumbnail}
            alt={world.name}
            className="history-thumbnail"
          />
        ) : (
          <div className="history-thumbnail-placeholder" />
        )}
        <div className="history-scene-details">
          <div className="history-scene-name" title={world.name}>
            {world.name}
          </div>
          {world.title && world.title !== 'Untitled' && (
            <div className="history-world-name">{world.title}</div>
          )}
          <div className="history-position">
            {world.parcels} parcel{world.parcels !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="history-scene-id">
        <code>{world.sceneId}</code>
      </div>

      <div className="history-card-footer">
        <button className="history-view-report-btn" onClick={onViewReport}>
          View Report
        </button>
      </div>
    </div>
  );
}

interface BulkQueueResult {
  success: boolean;
  total: number;
  queued: number;
  failed: number;
  results: {
    success: string[];
    failed: { sceneId: string; error: string }[];
  };
}

export function FailingView({ worlds, lands }: FailingViewProps) {
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'scenes' | 'worlds'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [isQueuing, setIsQueuing] = useState(false);
  const [queueResult, setQueueResult] = useState<BulkQueueResult | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const failedWorlds = worlds.filter(w => w.hasFailed);
  const failedScenes = getFailedScenes(lands);

  const totalFailed = failedWorlds.length + failedScenes.length;

  // Filter scenes based on search query (by name, position, or sceneId)
  const filteredScenes = failedScenes.filter(scene => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    // Check positions
    if (scene.positions.some(pos => pos.includes(query))) return true;
    // Check sceneId
    if (scene.sceneId.toLowerCase().includes(query)) return true;
    // Check cached metadata name
    const metadata = sceneMetadataCache.get(scene.sceneId);
    if (metadata?.name?.toLowerCase().includes(query)) return true;
    return false;
  });

  // Filter worlds based on search query
  const filteredWorlds = failedWorlds.filter(world => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (world.name.toLowerCase().includes(query)) return true;
    if (world.title?.toLowerCase().includes(query)) return true;
    if (world.sceneId.toLowerCase().includes(query)) return true;
    return false;
  });

  // Get scene IDs based on current filter AND search query
  const getSceneIdsToQueue = (): string[] => {
    const ids: string[] = [];
    if (filter === 'all' || filter === 'scenes') {
      ids.push(...filteredScenes.map(s => s.sceneId));
    }
    if (filter === 'all' || filter === 'worlds') {
      ids.push(...filteredWorlds.map(w => w.sceneId));
    }
    return ids;
  };

  const handleCopySceneIds = async () => {
    const sceneIds = getSceneIdsToQueue();
    if (sceneIds.length === 0) return;

    try {
      await navigator.clipboard.writeText(sceneIds.join('\n'));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleAddToPriority = () => {
    setShowPasswordModal(true);
    setPassword('');
    setQueueResult(null);
    setQueueError(null);
  };

  const handleSubmitQueue = async () => {
    const sceneIds = getSceneIdsToQueue();
    if (sceneIds.length === 0) return;

    setIsQueuing(true);
    setQueueError(null);
    setQueueResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/monitoring/queue-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          sceneIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setQueueError(data.error || 'Failed to queue scenes');
      } else {
        setQueueResult(data);
      }
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsQueuing(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPassword('');
    setQueueResult(null);
    setQueueError(null);
  };

  if (totalFailed === 0) {
    return (
      <div className="failing-view">
        <h3>Failing Scenes & Worlds</h3>
        <div className="no-failing">
          No failing scenes or worlds found. Everything is working correctly!
        </div>
      </div>
    );
  }

  const showScenes = filter === 'all' || filter === 'scenes';
  const showWorlds = filter === 'all' || filter === 'worlds';

  return (
    <div className="failing-view">
      <h3>Failing Scenes & Worlds</h3>

      <div className="failing-stats">
        <div className="stat-card failed">
          <div className="stat-value">{totalFailed}</div>
          <div className="stat-label">Total Failed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{failedScenes.length}</div>
          <div className="stat-label">Failed Scenes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{failedWorlds.length}</div>
          <div className="stat-label">Failed Worlds</div>
        </div>
      </div>

      <div className="failing-controls">
        <div className="failing-controls-row">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, position, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All ({totalFailed})
            </button>
            <button
              className={filter === 'scenes' ? 'active' : ''}
              onClick={() => setFilter('scenes')}
            >
              Scenes ({failedScenes.length})
            </button>
            <button
              className={filter === 'worlds' ? 'active' : ''}
              onClick={() => setFilter('worlds')}
            >
              Worlds ({failedWorlds.length})
            </button>
          </div>
        </div>
        <div className="failing-actions">
          <button
            className="copy-ids-btn"
            onClick={handleCopySceneIds}
            disabled={getSceneIdsToQueue().length === 0}
          >
            {copySuccess ? 'Copied!' : `Copy Scene IDs (${getSceneIdsToQueue().length})`}
          </button>
          <button
            className="add-to-priority-btn"
            onClick={handleAddToPriority}
            disabled={getSceneIdsToQueue().length === 0}
          >
            Add All to Priority ({getSceneIdsToQueue().length})
          </button>
        </div>
      </div>

      {searchQuery && (
        <div className="failing-filter-info">
          Showing {filteredScenes.length + filteredWorlds.length} of {totalFailed} failed items
        </div>
      )}

      <div className="history-grid">
        {showWorlds && filteredWorlds.map((world) => (
          <FailedWorldCard
            key={world.sceneId}
            world={world}
            onViewReport={() => setSelectedSceneId(world.sceneId)}
          />
        ))}
        {showScenes && filteredScenes.map((scene) => (
          <FailedSceneCard
            key={scene.sceneId}
            sceneId={scene.sceneId}
            positions={scene.positions}
            onViewReport={() => setSelectedSceneId(scene.sceneId)}
          />
        ))}
      </div>

      {selectedSceneId && (
        <ReportModal
          sceneId={selectedSceneId}
          onClose={() => setSelectedSceneId(null)}
        />
      )}

      {showPasswordModal && (
        <div className="modal-overlay" onClick={closePasswordModal}>
          <div className="modal-content priority-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closePasswordModal}>&times;</button>
            <h3>Add to Priority Queue</h3>

            {!queueResult && !isQueuing && (
              <>
                <p className="modal-description">
                  This will add {getSceneIdsToQueue().length} scene(s) to the priority queue for re-processing.
                </p>
                <div className="modal-form">
                  <label>
                    Password:
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && password && handleSubmitQueue()}
                    />
                  </label>
                </div>
                {queueError && (
                  <div className="modal-error">{queueError}</div>
                )}
                <div className="modal-actions">
                  <button onClick={closePasswordModal} className="modal-btn cancel">
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitQueue}
                    className="modal-btn submit"
                    disabled={!password}
                  >
                    Add to Queue
                  </button>
                </div>
              </>
            )}

            {isQueuing && (
              <div className="modal-loading">
                <div className="spinner" />
                <p>Adding scenes to priority queue...</p>
              </div>
            )}

            {queueResult && (
              <div className="modal-result">
                <div className={`result-summary ${queueResult.failed > 0 ? 'partial' : 'success'}`}>
                  <div className="result-icon">
                    {queueResult.failed === 0 ? '✓' : '⚠'}
                  </div>
                  <div className="result-text">
                    <strong>{queueResult.queued}</strong> of <strong>{queueResult.total}</strong> scenes queued
                  </div>
                </div>
                {queueResult.failed > 0 && (
                  <div className="result-failures">
                    <p>{queueResult.failed} scene(s) failed to queue:</p>
                    <ul>
                      {queueResult.results.failed.slice(0, 5).map((f, i) => (
                        <li key={i}>
                          <code>{f.sceneId.slice(0, 20)}...</code>: {f.error}
                        </li>
                      ))}
                      {queueResult.results.failed.length > 5 && (
                        <li>...and {queueResult.results.failed.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
                <div className="modal-actions">
                  <button onClick={closePasswordModal} className="modal-btn submit">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
