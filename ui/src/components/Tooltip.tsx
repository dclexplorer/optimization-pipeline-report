import type { LandData } from '../types';
import { formatFileSize } from '../utils/formatters';

interface TooltipProps {
  land: LandData;
  x: number;
  y: number;
}

export function Tooltip({ land, x, y }: TooltipProps) {
  const getStatusDisplay = () => {
    if (land.hasOptimizedAssets) {
      return <span className="tooltip-optimized">Optimized</span>;
    }
    if (land.optimizationReport) {
      if (land.optimizationReport.success) {
        return <span className="tooltip-optimized">Report: Success</span>;
      }
      return <span className="tooltip-failed">Report: Failed</span>;
    }
    if (land.sceneId) {
      return <span className="tooltip-not-optimized">Not Optimized</span>;
    }
    return 'N/A';
  };

  return (
    <div
      className="tooltip show"
      style={{
        left: x + 15,
        top: y + 15,
      }}
    >
      <div className="tooltip-title">Land Information</div>
      <div>Position: ({land.x}, {land.y})</div>
      <div>Scene ID: {land.sceneId || 'Empty'}</div>
      <div>Status: {getStatusDisplay()}</div>

      {land.optimizationReport && (
        <div className="tooltip-report">
          <div style={{ fontWeight: 'bold', marginBottom: 5 }}>Optimization Report:</div>
          {land.optimizationReport.error && (
            <div className="tooltip-report-item">
              <span className="tooltip-report-label">Error:</span>{' '}
              <span style={{ color: '#ef4444' }}>{land.optimizationReport.error}</span>
            </div>
          )}
          {land.optimizationReport.details?.originalSize && (
            <div className="tooltip-report-item">
              <span className="tooltip-report-label">Original:</span>{' '}
              {formatFileSize(land.optimizationReport.details.originalSize)}
            </div>
          )}
          {land.optimizationReport.details?.optimizedSize && (
            <div className="tooltip-report-item">
              <span className="tooltip-report-label">Optimized:</span>{' '}
              {formatFileSize(land.optimizationReport.details.optimizedSize)}
            </div>
          )}
        </div>
      )}

      {land.sceneId && (
        <div style={{ marginTop: 5, fontSize: 11, color: '#10b981' }}>
          Double-click to view report
        </div>
      )}
    </div>
  );
}
