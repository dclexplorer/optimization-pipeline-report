import { useState, useCallback } from 'react';
import type { TabName, MapView, LandData } from '../types';
import { useReportData } from '../hooks/useReportData';
import { Header } from './Header';
import { TabNavigation } from './TabNavigation';
import { StatsGrid } from './StatsGrid';
import { ProgressBar } from './ProgressBar';
import { WorldMap } from './WorldMap/WorldMap';
import { ViewToggle } from './ViewToggle';
import { Legend } from './Legend';
import { Tooltip } from './Tooltip';
import { ReportModal } from './ReportModal';
import { HistoryView } from './HistoryView';

export default function App() {
  const { data, isLoading, error } = useReportData();
  const [activeTab, setActiveTab] = useState<TabName>('overview');
  const [mapView, setMapView] = useState<MapView>('scenes');
  const [optimizationMapView, setOptimizationMapView] = useState<MapView>('optimization');
  const [hoveredLand, setHoveredLand] = useState<{ land: LandData; x: number; y: number } | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  const handleLandClick = useCallback((land: LandData) => {
    if (land.sceneId) {
      setSelectedSceneId(land.sceneId);
    }
  }, []);

  const handleLandHover = useCallback((land: LandData | null, x: number, y: number) => {
    if (land) {
      setHoveredLand({ land, x, y });
    } else {
      setHoveredLand(null);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedSceneId(null);
  }, []);

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading">Loading report data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container">
        <div className="error-message">
          Failed to load report: {error || 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header generatedAt={data.generatedAt} />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="tab-content active">
          <StatsGrid stats={data.stats} variant="overview" />

          <div className="map-section">
            <h2 className="map-title">Interactive World Map</h2>
            <ViewToggle currentView={mapView} onViewChange={setMapView} />
            <WorldMap
              lands={data.lands}
              sceneColorIndices={data.sceneColorIndices}
              view={mapView}
              onLandClick={handleLandClick}
              onLandHover={handleLandHover}
            />
            <Legend view={mapView} />
          </div>
        </div>
      )}

      {activeTab === 'optimization' && (
        <div className="tab-content active">
          <div className="optimization-stats">
            <h2 className="map-title">Asset Optimization Status</h2>
            <ProgressBar percentage={data.stats.optimizationPercentage} />
            <StatsGrid stats={data.stats} variant="optimization" />

            <div className="map-section">
              <h3 className="map-title">Optimization Map</h3>
              <ViewToggle currentView={optimizationMapView} onViewChange={setOptimizationMapView} />
              <WorldMap
                lands={data.lands}
                sceneColorIndices={data.sceneColorIndices}
                view={optimizationMapView}
                onLandClick={handleLandClick}
                onLandHover={handleLandHover}
              />
              <Legend view={optimizationMapView} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="tab-content active">
          <HistoryView />
        </div>
      )}

      {hoveredLand && (
        <Tooltip land={hoveredLand.land} x={hoveredLand.x} y={hoveredLand.y} />
      )}

      <ReportModal sceneId={selectedSceneId} onClose={handleCloseModal} />
    </div>
  );
}
