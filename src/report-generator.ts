import { WorldData } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class ReportGenerator {
  private colorCache: Map<string, string> = new Map();
  private colorIndex = 0;

  private getColorForScene(sceneId: string | null): string {
    if (!sceneId) return '#1a1a1a';
    
    if (!this.colorCache.has(sceneId)) {
      const hue = (this.colorIndex * 137.5) % 360;
      this.colorCache.set(sceneId, `hsl(${hue}, 70%, 50%)`);
      this.colorIndex++;
    }
    
    return this.colorCache.get(sceneId)!;
  }

  public generateReportData(worldData: WorldData, stats: any): any {
    const landsArray = Array.from(worldData.lands.values());
    
    // ULTRA COMPRESSED: Only include occupied lands to drastically reduce size
    const occupiedLands = landsArray
      .filter(land => land.sceneId !== null) // Only include lands with scenes
      .map(land => {
        // Use array format instead of object to save space
        // Format: [x, y, sceneId, hasOptimized, hasReport, reportSuccess]
        const compressed: any[] = [
          land.x,
          land.y,
          land.sceneId
        ];
        
        // Add optimization status (1 = optimized, 0 = not)
        compressed.push(land.hasOptimizedAssets ? 1 : 0);
        
        // Add report status if exists (1 = success, 0 = failed, undefined = no report)
        if (land.optimizationReport) {
          compressed.push(land.optimizationReport.success ? 1 : 0);
        }
        
        return compressed;
      });
    
    // Create a scene ID to color index map (use indices instead of color strings)
    const sceneIds = Array.from(worldData.scenes.keys());
    const sceneColorIndices: Record<string, number> = {};
    sceneIds.forEach((sceneId, index) => {
      sceneColorIndices[sceneId] = index;
    });
    
    return {
      // Use abbreviated keys
      l: occupiedLands, // lands (only occupied)
      s: stats, // stats
      c: sceneColorIndices, // color indices for scenes
      g: Date.now() // generated timestamp (shorter than ISO string)
    };
  }

  public generateHTML(worldData: WorldData, stats: any): string {
    const landsArray = Array.from(worldData.lands.values());
    
    // Minimize report data to prevent JSON.stringify errors
    const minimalLands = landsArray.map(land => {
      // Only include lands with scenes or reports to reduce data size
      if (!land.sceneId) {
        return {
          x: land.x,
          y: land.y,
          s: null, // sceneId shortened to 's'
          o: false, // hasOptimizedAssets shortened to 'o'
        };
      }
      
      const minimal: any = {
        x: land.x,
        y: land.y,
        s: land.sceneId,
        o: land.hasOptimizedAssets || false,
      };
      
      // Only add report if it exists
      if (land.optimizationReport) {
        minimal.r = {
          ok: land.optimizationReport.success || false,
          id: land.sceneId, // Store scene ID to construct URL
        };
        
        // Only add error if exists and truncate it
        if (land.optimizationReport.error) {
          const errorStr = typeof land.optimizationReport.error === 'string' 
            ? land.optimizationReport.error 
            : JSON.stringify(land.optimizationReport.error);
          minimal.r.err = errorStr.substring(0, 50);
        }
        
        // Only add essential numeric details
        if (land.optimizationReport.details) {
          const d = land.optimizationReport.details;
          if (d.originalSize || d.optimizedSize) {
            minimal.r.d = {
              o: d.originalSize,
              c: d.optimizedSize,
            };
          }
        }
      }
      
      return minimal;
    });
    
    let landsJson: string;
    try {
      landsJson = JSON.stringify(minimalLands);
    } catch (e) {
      console.error('Failed to stringify land data, using ultra-minimal format');
      // Ultra-minimal fallback: only occupied lands with basic info
      const ultraMinimal = landsArray
        .filter(land => land.sceneId)
        .map(land => ({
          x: land.x,
          y: land.y,
          s: land.sceneId?.substring(0, 10),
          o: land.hasOptimizedAssets ? 1 : 0,
          r: land.optimizationReport?.success ? 1 : 0
        }));
      landsJson = JSON.stringify(ultraMinimal);
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Decentraland Asset Optimization Pipeline Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .tabs {
            display: flex;
            background: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
        }
        
        .tab {
            padding: 15px 30px;
            cursor: pointer;
            background: transparent;
            border: none;
            font-size: 1.1em;
            color: #6c757d;
            transition: all 0.3s;
            position: relative;
        }
        
        .tab:hover {
            background: rgba(102, 126, 234, 0.1);
        }
        
        .tab.active {
            color: #667eea;
            font-weight: bold;
        }
        
        .tab.active::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            right: 0;
            height: 3px;
            background: #667eea;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-card.optimized {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
        }
        
        .stat-card.not-optimized {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
        }
        
        .stat-card.warning {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
        }
        
        .stat-card.info {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }
        
        .stat-card.optimized .stat-value,
        .stat-card.not-optimized .stat-value,
        .stat-card.warning .stat-value,
        .stat-card.info .stat-value {
            color: white;
        }
        
        .stat-label {
            font-size: 0.9em;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .stat-card.optimized .stat-label,
        .stat-card.not-optimized .stat-label,
        .stat-card.warning .stat-label,
        .stat-card.info .stat-label {
            color: rgba(255, 255, 255, 0.9);
        }
        
        .map-container {
            padding: 30px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .map-title {
            font-size: 1.8em;
            color: #333;
            margin-bottom: 20px;
        }
        
        .canvas-wrapper {
            position: relative;
            border: 2px solid #dee2e6;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        
        canvas {
            display: block;
            cursor: crosshair;
            background: #0a0a0a;
        }
        
        canvas.clickable {
            cursor: pointer;
        }
        
        .tooltip {
            position: fixed;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 12px 15px;
            border-radius: 8px;
            font-size: 13px;
            pointer-events: none;
            z-index: 1000;
            display: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
            max-width: 400px;
        }
        
        .tooltip.show {
            display: block;
        }
        
        .tooltip-title {
            font-weight: bold;
            color: #667eea;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .tooltip-optimized {
            color: #10b981;
            font-weight: bold;
        }
        
        .tooltip-not-optimized {
            color: #ef4444;
            font-weight: bold;
        }
        
        .tooltip-failed {
            color: #f59e0b;
            font-weight: bold;
        }
        
        .tooltip-report {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid rgba(255,255,255,0.2);
            font-size: 12px;
        }
        
        .tooltip-report-item {
            margin: 3px 0;
            color: rgba(255,255,255,0.9);
        }
        
        .tooltip-report-label {
            color: rgba(255,255,255,0.6);
            display: inline-block;
            min-width: 80px;
        }
        
        .controls {
            margin-top: 20px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
        }
        
        .control-btn {
            padding: 10px 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }
        
        .control-btn:hover {
            background: #764ba2;
        }
        
        .control-btn.active {
            background: #764ba2;
        }
        
        .zoom-controls {
            display: flex;
            gap: 5px;
            align-items: center;
        }
        
        .zoom-label {
            color: #6c757d;
            font-size: 14px;
        }
        
        .legend {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 3px;
            border: 1px solid #dee2e6;
        }
        
        .legend-label {
            font-size: 14px;
            color: #495057;
        }
        
        .optimization-stats {
            padding: 30px;
            background: #f8f9fa;
        }
        
        .progress-bar {
            width: 100%;
            height: 40px;
            background: #e9ecef;
            border-radius: 20px;
            overflow: hidden;
            margin: 20px 0;
            position: relative;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            transition: width 1s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        
        .view-toggle {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .report-status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .report-status-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .report-status-card.success {
            border-left-color: #10b981;
        }
        
        .report-status-card.failed {
            border-left-color: #f59e0b;
        }
        
        .report-status-card.error {
            border-left-color: #ef4444;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 2000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.7);
            animation: fadeIn 0.3s;
        }
        
        .modal.show {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-content {
            background: #1e1e1e;
            padding: 20px;
            border-radius: 12px;
            width: 90%;
            max-width: 800px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            animation: slideIn 0.3s;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #444;
        }
        
        .modal-title {
            color: #667eea;
            font-size: 1.3em;
            font-weight: bold;
        }
        
        .modal-close {
            color: #aaa;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            background: none;
            border: none;
            padding: 0;
            line-height: 1;
        }
        
        .modal-close:hover {
            color: #fff;
        }
        
        .modal-body {
            overflow: auto;
            flex: 1;
            background: #0d0d0d;
            border-radius: 8px;
            padding: 15px;
        }
        
        .json-viewer {
            color: #d4d4d4;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .json-key {
            color: #9cdcfe;
        }
        
        .json-string {
            color: #ce9178;
        }
        
        .json-number {
            color: #b5cea8;
        }
        
        .json-boolean {
            color: #569cd6;
        }
        
        .json-null {
            color: #569cd6;
        }
        
        .loading {
            text-align: center;
            color: #667eea;
            padding: 40px;
        }
        
        .error-message {
            color: #ef4444;
            padding: 20px;
            text-align: center;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗺️ Decentraland World Report</h1>
            <p>Asset Optimization Pipeline Status - Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="tabs">
            <button class="tab active" onclick="switchTab('overview')">📊 Overview</button>
            <button class="tab" onclick="switchTab('optimization')">⚡ Optimization Status</button>
        </div>
        
        <div id="overview" class="tab-content active">
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-value">${stats.totalLands.toLocaleString()}</div>
                    <div class="stat-label">Total Lands</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.occupiedLands.toLocaleString()}</div>
                    <div class="stat-label">Occupied Lands</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.emptyLands.toLocaleString()}</div>
                    <div class="stat-label">Empty Lands</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalScenes.toLocaleString()}</div>
                    <div class="stat-label">Total Scenes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.averageLandsPerScene.toFixed(2)}</div>
                    <div class="stat-label">Avg Lands/Scene</div>
                </div>
            </div>
            
            <div class="map-container">
                <h2 class="map-title">Interactive World Map</h2>
                <div class="view-toggle">
                    <button class="control-btn" onclick="setMapView('scenes')">🎨 Scene View</button>
                    <button class="control-btn" onclick="setMapView('optimization')">⚡ Optimization View</button>
                    <button class="control-btn" onclick="setMapView('reports')">📋 Report Status View</button>
                </div>
                <div class="canvas-wrapper">
                    <canvas id="worldMap" width="975" height="975"></canvas>
                </div>
                
                <div class="controls">
                    <div class="zoom-controls">
                        <span class="zoom-label">Zoom:</span>
                        <button class="control-btn" onclick="zoomIn()">+</button>
                        <button class="control-btn" onclick="zoomOut()">-</button>
                        <button class="control-btn" onclick="resetZoom()">Reset</button>
                    </div>
                    <button class="control-btn" onclick="downloadMap()">📥 Download Map</button>
                </div>
                
                <div class="legend" id="mapLegend">
                    <div class="legend-item">
                        <div class="legend-color" style="background: #1a1a1a"></div>
                        <span class="legend-label">Empty Land</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: linear-gradient(45deg, #667eea, #764ba2)"></div>
                        <span class="legend-label">Occupied by Scene</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="optimization" class="tab-content">
            <div class="optimization-stats">
                <h2 class="map-title">Asset Optimization Status</h2>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${stats.optimizationPercentage}%">
                        ${stats.optimizationPercentage.toFixed(1)}% Optimized
                    </div>
                </div>
                
                <div class="stats">
                    <div class="stat-card optimized">
                        <div class="stat-value">${stats.scenesWithOptimizedAssets.toLocaleString()}</div>
                        <div class="stat-label">Scenes with Optimized Assets</div>
                    </div>
                    <div class="stat-card not-optimized">
                        <div class="stat-value">${stats.scenesWithoutOptimizedAssets.toLocaleString()}</div>
                        <div class="stat-label">Scenes without Optimized Assets</div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-value">${stats.scenesWithReports.toLocaleString()}</div>
                        <div class="stat-label">Scenes with Reports</div>
                    </div>
                    <div class="stat-card info">
                        <div class="stat-value">${stats.successfulOptimizations.toLocaleString()}</div>
                        <div class="stat-label">Successful Optimizations</div>
                    </div>
                    <div class="stat-card not-optimized">
                        <div class="stat-value">${stats.failedOptimizations.toLocaleString()}</div>
                        <div class="stat-label">Failed Optimizations</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.optimizationPercentage.toFixed(1)}%</div>
                        <div class="stat-label">Optimization Coverage</div>
                    </div>
                </div>
                
                <div class="map-container">
                    <h3 class="map-title">Optimization Map</h3>
                    <div class="canvas-wrapper">
                        <canvas id="optimizationMap" width="975" height="975"></canvas>
                    </div>
                    
                    <div class="controls">
                        <div class="zoom-controls">
                            <span class="zoom-label">Zoom:</span>
                            <button class="control-btn" onclick="zoomInOpt()">+</button>
                            <button class="control-btn" onclick="zoomOutOpt()">-</button>
                            <button class="control-btn" onclick="resetZoomOpt()">Reset</button>
                        </div>
                        <button class="control-btn" onclick="downloadOptMap()">📥 Download Map</button>
                    </div>
                    
                    <div class="legend">
                        <div class="legend-item">
                            <div class="legend-color" style="background: #1a1a1a"></div>
                            <span class="legend-label">Empty Land</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #10b981"></div>
                            <span class="legend-label">Optimized Scene</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #f59e0b"></div>
                            <span class="legend-label">Has Report (Failed)</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #ef4444"></div>
                            <span class="legend-label">Not Optimized</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="tooltip" id="tooltip">
        <div class="tooltip-title">Land Information</div>
        <div id="tooltipContent"></div>
    </div>
    
    <div id="reportModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title" id="modalTitle">Optimization Report</div>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div id="modalContent" class="json-viewer"></div>
            </div>
        </div>
    </div>
    
    <script>
        const compressedData = ${landsJson};
        
        // Decompress the minimal data format
        const worldData = compressedData.map(land => ({
            x: land.x,
            y: land.y,
            sceneId: land.s,
            hasOptimizedAssets: land.o,
            optimizationReport: land.r ? {
                success: land.r.ok,
                error: land.r.err,
                details: land.r.d ? {
                    originalSize: land.r.d.o,
                    optimizedSize: land.r.d.c,
                    compressionRatio: land.r.d.c && land.r.d.o ? 
                        (land.r.d.c / land.r.d.o) : undefined
                } : undefined
            } : undefined
        }));
        
        const canvas = document.getElementById('worldMap');
        const ctx = canvas.getContext('2d');
        const optCanvas = document.getElementById('optimizationMap');
        const optCtx = optCanvas.getContext('2d');
        const tooltip = document.getElementById('tooltip');
        const tooltipContent = document.getElementById('tooltipContent');
        
        const WORLD_SIZE = 351;
        const CELL_SIZE = 3;
        const OFFSET = 175;
        
        let zoom = 1;
        let offsetX = 0;
        let offsetY = 0;
        let zoomOpt = 1;
        let offsetXOpt = 0;
        let offsetYOpt = 0;
        let currentMapView = 'scenes';
        
        const landMap = new Map();
        worldData.forEach(land => {
            landMap.set(\`\${land.x},\${land.y}\`, land);
        });
        
        const sceneColors = new Map();
        let colorIndex = 0;
        
        function getColorForScene(sceneId) {
            if (!sceneId) return '#1a1a1a';
            
            if (!sceneColors.has(sceneId)) {
                const hue = (colorIndex * 137.5) % 360;
                sceneColors.set(sceneId, \`hsl(\${hue}, 70%, 50%)\`);
                colorIndex++;
            }
            
            return sceneColors.get(sceneId);
        }
        
        function getOptimizationColor(land) {
            if (!land.sceneId) return '#1a1a1a';
            if (land.hasOptimizedAssets) return '#10b981';
            if (land.optimizationReport) {
                return land.optimizationReport.success ? '#10b981' : '#f59e0b';
            }
            return '#ef4444';
        }
        
        function getReportStatusColor(land) {
            if (!land.sceneId) return '#1a1a1a';
            if (land.hasOptimizedAssets) return '#10b981';
            if (land.optimizationReport) {
                return land.optimizationReport.success ? '#3b82f6' : '#f59e0b';
            }
            return '#6b7280';
        }
        
        function drawMap() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.save();
            ctx.scale(zoom, zoom);
            ctx.translate(offsetX, offsetY);
            
            worldData.forEach(land => {
                const x = (land.x + OFFSET) * CELL_SIZE;
                const y = (land.y + OFFSET) * CELL_SIZE;
                
                if (currentMapView === 'optimization') {
                    ctx.fillStyle = getOptimizationColor(land);
                } else if (currentMapView === 'reports') {
                    ctx.fillStyle = getReportStatusColor(land);
                } else {
                    ctx.fillStyle = getColorForScene(land.sceneId);
                }
                ctx.fillRect(x, y, CELL_SIZE - 0.5, CELL_SIZE - 0.5);
            });
            
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(OFFSET * CELL_SIZE, 0);
            ctx.lineTo(OFFSET * CELL_SIZE, WORLD_SIZE * CELL_SIZE);
            ctx.moveTo(0, OFFSET * CELL_SIZE);
            ctx.lineTo(WORLD_SIZE * CELL_SIZE, OFFSET * CELL_SIZE);
            ctx.stroke();
            
            ctx.restore();
        }
        
        function drawOptimizationMap() {
            optCtx.clearRect(0, 0, optCanvas.width, optCanvas.height);
            
            optCtx.save();
            optCtx.scale(zoomOpt, zoomOpt);
            optCtx.translate(offsetXOpt, offsetYOpt);
            
            worldData.forEach(land => {
                const x = (land.x + OFFSET) * CELL_SIZE;
                const y = (land.y + OFFSET) * CELL_SIZE;
                
                optCtx.fillStyle = getOptimizationColor(land);
                optCtx.fillRect(x, y, CELL_SIZE - 0.5, CELL_SIZE - 0.5);
            });
            
            optCtx.strokeStyle = '#333';
            optCtx.lineWidth = 0.5;
            optCtx.beginPath();
            optCtx.moveTo(OFFSET * CELL_SIZE, 0);
            optCtx.lineTo(OFFSET * CELL_SIZE, WORLD_SIZE * CELL_SIZE);
            optCtx.moveTo(0, OFFSET * CELL_SIZE);
            optCtx.lineTo(WORLD_SIZE * CELL_SIZE, OFFSET * CELL_SIZE);
            optCtx.stroke();
            
            optCtx.restore();
        }
        
        function setMapView(view) {
            currentMapView = view;
            const buttons = document.querySelectorAll('.view-toggle .control-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            const legend = document.getElementById('mapLegend');
            if (view === 'optimization') {
                legend.innerHTML = \`
                    <div class="legend-item">
                        <div class="legend-color" style="background: #1a1a1a"></div>
                        <span class="legend-label">Empty Land</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #10b981"></div>
                        <span class="legend-label">Optimized</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #f59e0b"></div>
                        <span class="legend-label">Has Report (Failed)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #ef4444"></div>
                        <span class="legend-label">Not Optimized</span>
                    </div>
                \`;
            } else if (view === 'reports') {
                legend.innerHTML = \`
                    <div class="legend-item">
                        <div class="legend-color" style="background: #1a1a1a"></div>
                        <span class="legend-label">Empty Land</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #10b981"></div>
                        <span class="legend-label">Optimized</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #3b82f6"></div>
                        <span class="legend-label">Report (Success)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #f59e0b"></div>
                        <span class="legend-label">Report (Failed)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #6b7280"></div>
                        <span class="legend-label">No Report</span>
                    </div>
                \`;
            } else {
                legend.innerHTML = \`
                    <div class="legend-item">
                        <div class="legend-color" style="background: #1a1a1a"></div>
                        <span class="legend-label">Empty Land</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: linear-gradient(45deg, #667eea, #764ba2)"></div>
                        <span class="legend-label">Occupied by Scene</span>
                    </div>
                \`;
            }
            
            drawMap();
        }
        
        function getCoordsFromMouse(e, canvasEl, zoomLevel, offsetXVal, offsetYVal) {
            const rect = canvasEl.getBoundingClientRect();
            const x = (e.clientX - rect.left) / zoomLevel - offsetXVal;
            const y = (e.clientY - rect.top) / zoomLevel - offsetYVal;
            
            const landX = Math.floor(x / CELL_SIZE) - OFFSET;
            const landY = Math.floor(y / CELL_SIZE) - OFFSET;
            
            return { x: landX, y: landY };
        }
        
        function formatReportData(report) {
            if (!report) return '';
            
            let html = '<div class="tooltip-report">';
            html += '<div style="font-weight:bold; margin-bottom:5px;">📋 Optimization Report:</div>';
            
            if (report.success !== undefined) {
                const statusText = report.success ? 
                    '<span class="tooltip-optimized">✓ Successful</span>' : 
                    '<span class="tooltip-failed">✗ Failed</span>';
                html += \`<div class="tooltip-report-item"><span class="tooltip-report-label">Status:</span> \${statusText}</div>\`;
            }
            
            if (report.error) {
                html += \`<div class="tooltip-report-item"><span class="tooltip-report-label">Error:</span> <span style="color:#ef4444">\${report.error}</span></div>\`;
            }
            
            if (report.timestamp) {
                const date = new Date(report.timestamp);
                html += \`<div class="tooltip-report-item"><span class="tooltip-report-label">Date:</span> \${date.toLocaleDateString()}</div>\`;
            }
            
            if (report.details) {
                if (report.details.originalSize) {
                    const mb = (report.details.originalSize / (1024 * 1024)).toFixed(2);
                    html += \`<div class="tooltip-report-item"><span class="tooltip-report-label">Original:</span> \${mb} MB</div>\`;
                }
                if (report.details.optimizedSize) {
                    const mb = (report.details.optimizedSize / (1024 * 1024)).toFixed(2);
                    html += \`<div class="tooltip-report-item"><span class="tooltip-report-label">Optimized:</span> \${mb} MB</div>\`;
                }
                if (report.details.compressionRatio) {
                    html += \`<div class="tooltip-report-item"><span class="tooltip-report-label">Compression:</span> \${(report.details.compressionRatio * 100).toFixed(1)}%</div>\`;
                }
            }
            
            html += '</div>';
            return html;
        }
        
        function setupCanvasEvents(canvasEl, zoomLevel, offsetXVal, offsetYVal) {
            let hoveredLand = null;
            
            canvasEl.addEventListener('mousemove', (e) => {
                const coords = getCoordsFromMouse(e, canvasEl, 
                    canvasEl === canvas ? zoom : zoomOpt,
                    canvasEl === canvas ? offsetX : offsetXOpt,
                    canvasEl === canvas ? offsetY : offsetYOpt
                );
                const land = landMap.get(\`\${coords.x},\${coords.y}\`);
                hoveredLand = land;
                
                if (land && coords.x >= -175 && coords.x <= 175 && coords.y >= -175 && coords.y <= 175) {
                    // Change cursor if there's a scene (we can always try to fetch its report)
                    if (land.sceneId) {
                        canvasEl.style.cursor = 'pointer';
                    } else {
                        canvasEl.style.cursor = 'crosshair';
                    }
                    
                    tooltip.classList.add('show');
                    tooltip.style.left = e.clientX + 15 + 'px';
                    tooltip.style.top = e.clientY + 15 + 'px';
                    
                    let optimizationStatus = '';
                    let clickHint = '';
                    
                    if (land.hasOptimizedAssets) {
                        optimizationStatus = '<span class="tooltip-optimized">✓ Optimized</span>';
                        clickHint = '<div style="margin-top: 5px; font-size: 11px; color: #10b981;">📋 Click to view report</div>';
                    } else if (land.optimizationReport) {
                        if (land.optimizationReport.success) {
                            optimizationStatus = '<span class="tooltip-optimized">✓ Report: Success</span>';
                        } else {
                            optimizationStatus = '<span class="tooltip-failed">⚠ Report: Failed</span>';
                        }
                        clickHint = '<div style="margin-top: 5px; font-size: 11px; color: #f59e0b;">📋 Click to view report</div>';
                    } else if (land.sceneId) {
                        optimizationStatus = '<span class="tooltip-not-optimized">✗ Not Optimized</span>';
                        clickHint = '<div style="margin-top: 5px; font-size: 11px; color: #6b7280;">📋 Click to check for report</div>';
                    } else {
                        optimizationStatus = 'N/A';
                    }
                    
                    const reportHtml = land.optimizationReport ? formatReportData(land.optimizationReport) : '';
                    
                    tooltipContent.innerHTML = \`
                        <div>Position: (\${coords.x}, \${coords.y})</div>
                        <div>Scene ID: \${land.sceneId || 'Empty'}</div>
                        <div>Status: \${optimizationStatus}</div>
                        \${reportHtml}
                        \${clickHint}
                    \`;
                } else {
                    tooltip.classList.remove('show');
                    canvasEl.style.cursor = 'crosshair';
                }
            });
            
            canvasEl.addEventListener('click', async (e) => {
                if (!hoveredLand || !hoveredLand.sceneId) return;
                
                // Always try to fetch and show the report
                const sceneId = hoveredLand.sceneId;
                showReportModal(sceneId);
            });
            
            canvasEl.addEventListener('mouseleave', () => {
                tooltip.classList.remove('show');
                canvasEl.style.cursor = 'crosshair';
                hoveredLand = null;
            });
        }
        
        setupCanvasEvents(canvas);
        setupCanvasEvents(optCanvas);
        
        function switchTab(tabName) {
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(tabName).classList.add('active');
            
            if (tabName === 'optimization') {
                setTimeout(() => drawOptimizationMap(), 100);
            }
        }
        
        function zoomIn() {
            zoom = Math.min(zoom * 1.2, 5);
            drawMap();
        }
        
        function zoomOut() {
            zoom = Math.max(zoom / 1.2, 0.5);
            drawMap();
        }
        
        function resetZoom() {
            zoom = 1;
            offsetX = 0;
            offsetY = 0;
            drawMap();
        }
        
        function zoomInOpt() {
            zoomOpt = Math.min(zoomOpt * 1.2, 5);
            drawOptimizationMap();
        }
        
        function zoomOutOpt() {
            zoomOpt = Math.max(zoomOpt / 1.2, 0.5);
            drawOptimizationMap();
        }
        
        function resetZoomOpt() {
            zoomOpt = 1;
            offsetXOpt = 0;
            offsetYOpt = 0;
            drawOptimizationMap();
        }
        
        function downloadMap() {
            const link = document.createElement('a');
            link.download = 'decentraland-world-map.png';
            link.href = canvas.toDataURL();
            link.click();
        }
        
        function downloadOptMap() {
            const link = document.createElement('a');
            link.download = 'decentraland-optimization-map.png';
            link.href = optCanvas.toDataURL();
            link.click();
        }
        
        let isDragging = false;
        let dragStartX, dragStartY;
        
        function setupDrag(canvasEl) {
            canvasEl.addEventListener('mousedown', (e) => {
                if (e.button === 0 && e.shiftKey) {
                    isDragging = true;
                    if (canvasEl === canvas) {
                        dragStartX = e.clientX - offsetX * zoom;
                        dragStartY = e.clientY - offsetY * zoom;
                    } else {
                        dragStartX = e.clientX - offsetXOpt * zoomOpt;
                        dragStartY = e.clientY - offsetYOpt * zoomOpt;
                    }
                    canvasEl.style.cursor = 'grabbing';
                }
            });
            
            canvasEl.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    if (canvasEl === canvas) {
                        offsetX = (e.clientX - dragStartX) / zoom;
                        offsetY = (e.clientY - dragStartY) / zoom;
                        drawMap();
                    } else {
                        offsetXOpt = (e.clientX - dragStartX) / zoomOpt;
                        offsetYOpt = (e.clientY - dragStartY) / zoomOpt;
                        drawOptimizationMap();
                    }
                }
            });
            
            canvasEl.addEventListener('mouseup', () => {
                isDragging = false;
                canvasEl.style.cursor = 'crosshair';
            });
        }
        
        setupDrag(canvas);
        setupDrag(optCanvas);
        
        // Modal functions
        function syntaxHighlight(json) {
            if (typeof json !== 'string') {
                json = JSON.stringify(json, null, 2);
            }
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
        }
        
        async function showReportModal(sceneId) {
            const modal = document.getElementById('reportModal');
            const modalTitle = document.getElementById('modalTitle');
            const modalContent = document.getElementById('modalContent');
            
            modal.classList.add('show');
            modalTitle.textContent = \`Report: \${sceneId}\`;
            modalContent.innerHTML = '<div class="loading">Loading report...</div>';
            
            try {
                const response = await fetch(\`https://optimized-assets.dclexplorer.com/v1/\${sceneId}-report.json\`);
                
                if (response.ok) {
                    const data = await response.json();
                    modalContent.innerHTML = syntaxHighlight(data);
                } else if (response.status === 404) {
                    modalContent.innerHTML = '<div class="error-message">No report found for this scene</div>';
                } else {
                    modalContent.innerHTML = \`<div class="error-message">Error loading report: HTTP \${response.status}</div>\`;
                }
            } catch (error) {
                modalContent.innerHTML = \`<div class="error-message">Failed to load report: \${error.message}</div>\`;
            }
        }
        
        function closeModal() {
            const modal = document.getElementById('reportModal');
            modal.classList.remove('show');
        }
        
        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('reportModal');
            if (event.target === modal) {
                closeModal();
            }
        }
        
        // Close modal with ESC key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeModal();
            }
        });
        
        drawMap();
    </script>
</body>
</html>`;
  }

  public async saveReport(html: string, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`Report saved to: ${outputPath}`);
  }
}