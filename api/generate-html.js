// Template function to generate HTML from report data
export function generateHTMLFromData(reportData) {
  // Handle both old and new data formats
  const isV2 = reportData.v === 2;
  
  let lands, stats, sceneColors, generated;
  
  if (isV2) {
    // New compressed format
    lands = reportData.l;
    stats = reportData.s;
    const colorIndices = reportData.c;
    generated = new Date(reportData.g).toISOString();
    
    // Generate colors from indices
    sceneColors = {};
    Object.entries(colorIndices).forEach(([sceneId, index]) => {
      const hue = ((index as number) * 137.5) % 360;
      sceneColors[sceneId] = `hsl(${hue}, 70%, 50%)`;
    });
  } else {
    // Old format
    lands = reportData.lands;
    stats = reportData.stats;
    sceneColors = reportData.sceneColors;
    generated = reportData.generated;
  }
  
  const optimizationUrl = 'https://optimized-assets.dclexplorer.com/v1';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Decentraland World Report - Generated ${new Date(generated).toLocaleDateString()}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            color: #333;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        h1 {
            font-size: 28px;
            color: #667eea;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .stat-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        
        .main-content {
            flex: 1;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .controls {
            background: rgba(255, 255, 255, 0.95);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }
        
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            background: #667eea;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }
        
        button:hover {
            background: #5a67d8;
        }
        
        button.active {
            background: #764ba2;
        }
        
        .canvas-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        
        canvas {
            border: 1px solid #ddd;
            cursor: crosshair;
            display: block;
        }
        
        .info-panel {
            background: rgba(255, 255, 255, 0.95);
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-size: 14px;
            min-height: 40px;
        }
        
        .legend {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            margin-top: 10px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 2px;
            border: 1px solid #ddd;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 2000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            animation: fadeIn 0.3s;
        }
        
        .modal-content {
            background-color: #fefefe;
            margin: 5% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 80%;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            border-radius: 8px;
            animation: slideIn 0.3s;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        
        .close:hover,
        .close:focus {
            color: #000;
        }
        
        pre {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
        }
        
        .json-key {
            color: #a626a4;
        }
        
        .json-value {
            color: #50a14f;
        }
        
        .json-string {
            color: #e45649;
        }
        
        .loading {
            text-align: center;
            padding: 20px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>🗺️ Decentraland World Optimization Report</h1>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Total Lands</div>
                    <div class="stat-value">${stats.totalLands.toLocaleString()}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Occupied Lands</div>
                    <div class="stat-value">${stats.occupiedLands.toLocaleString()}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Scenes</div>
                    <div class="stat-value">${stats.totalScenes.toLocaleString()}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Optimized Scenes</div>
                    <div class="stat-value">${stats.scenesWithOptimizedAssets.toLocaleString()}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Optimization Coverage</div>
                    <div class="stat-value">${stats.optimizationPercentage.toFixed(1)}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Reports Available</div>
                    <div class="stat-value">${stats.scenesWithReports.toLocaleString()}</div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="main-content">
        <div class="controls">
            <button id="viewScenes" class="active">Scene View</button>
            <button id="viewOptimization">Optimization View</button>
            <button id="viewReports">Report Status</button>
            <span style="margin: 0 10px;">|</span>
            <button id="zoomIn">Zoom In</button>
            <button id="zoomOut">Zoom Out</button>
            <button id="resetView">Reset View</button>
            <button id="downloadMap">Download Map</button>
            <span style="margin: 0 10px;">|</span>
            <span style="font-size: 12px; color: #666;">
                Shift + Drag to pan • Scroll to zoom • Click to view report
            </span>
        </div>
        
        <div class="canvas-container">
            <canvas id="worldMap" width="975" height="975"></canvas>
            <div class="info-panel" id="infoPanel">
                Hover over the map to see land information
            </div>
            <div class="legend" id="legend">
                <div class="legend-item">
                    <div class="legend-color" style="background: #1a1a1a;"></div>
                    <span>Empty Land</span>
                </div>
            </div>
        </div>
    </div>
    
    <div id="reportModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2 id="modalTitle">Optimization Report</h2>
            <div id="modalBody">
                <div class="loading">Loading report...</div>
            </div>
        </div>
    </div>
    
    <script>
        const MIN_COORD = -175;
        const MAX_COORD = 175;
        const GRID_SIZE = MAX_COORD - MIN_COORD + 1;
        const OPTIMIZATION_URL = '${optimizationUrl}';
        const isV2 = ${isV2};
        const reportData = ${JSON.stringify({ lands, sceneColors, v: reportData.v })};
        const sceneColors = reportData.sceneColors;
        
        const canvas = document.getElementById('worldMap');
        const ctx = canvas.getContext('2d');
        const infoPanel = document.getElementById('infoPanel');
        const modal = document.getElementById('reportModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const closeModal = document.getElementsByClassName('close')[0];
        
        let cellSize = 3;
        let offsetX = 0;
        let offsetY = 0;
        let currentView = 'scenes';
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        
        const landsMap = new Map();
        
        if (isV2) {
            // New compressed format: [x, y, sceneId, hasOptimized, reportStatus]
            reportData.lands.forEach(land => {
                const [x, y, sceneId, hasOptimized, reportStatus] = land;
                const key = x + ',' + y;
                const landData = {
                    x: x,
                    y: y,
                    sceneId: sceneId,
                    hasOptimizedAssets: hasOptimized === 1
                };
                
                // Add report info if exists
                if (reportStatus !== undefined) {
                    landData.optimizationReport = {
                        ok: reportStatus === 1,
                        id: sceneId
                    };
                }
                
                landsMap.set(key, landData);
            });
        } else {
            // Old format
            reportData.lands.forEach(land => {
                const key = land.x + ',' + land.y;
                landsMap.set(key, {
                    x: land.x,
                    y: land.y,
                    sceneId: land.s,
                    hasOptimizedAssets: land.o,
                    optimizationReport: land.r
                });
            });
        }
        
        function resizeCanvas() {
            const size = GRID_SIZE * cellSize;
            canvas.width = size;
            canvas.height = size;
        }
        
        function drawGrid() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.save();
            ctx.translate(offsetX, offsetY);
            
            for (let x = MIN_COORD; x <= MAX_COORD; x++) {
                for (let y = MIN_COORD; y <= MAX_COORD; y++) {
                    const key = x + ',' + y;
                    const land = landsMap.get(key);
                    
                    const canvasX = (x - MIN_COORD) * cellSize;
                    const canvasY = (MAX_COORD - y) * cellSize;
                    
                    let color = '#1a1a1a';
                    
                    if (land && land.sceneId) {
                        if (currentView === 'scenes') {
                            color = sceneColors[land.sceneId] || '#666';
                        } else if (currentView === 'optimization') {
                            if (land.hasOptimizedAssets) {
                                color = '#10b981';
                            } else if (land.optimizationReport) {
                                color = land.optimizationReport.ok ? '#3b82f6' : '#f97316';
                            } else {
                                color = '#ef4444';
                            }
                        } else if (currentView === 'reports') {
                            if (land.optimizationReport) {
                                color = land.optimizationReport.ok ? '#3b82f6' : '#f97316';
                            } else {
                                color = '#6b7280';
                            }
                        }
                    }
                    
                    ctx.fillStyle = color;
                    ctx.fillRect(canvasX, canvasY, cellSize - 0.5, cellSize - 0.5);
                }
            }
            
            if (cellSize > 10) {
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 0.5;
                for (let x = MIN_COORD; x <= MAX_COORD; x++) {
                    const canvasX = (x - MIN_COORD) * cellSize;
                    ctx.beginPath();
                    ctx.moveTo(canvasX, 0);
                    ctx.lineTo(canvasX, canvas.height);
                    ctx.stroke();
                }
                for (let y = MIN_COORD; y <= MAX_COORD; y++) {
                    const canvasY = (y - MIN_COORD) * cellSize;
                    ctx.beginPath();
                    ctx.moveTo(0, canvasY);
                    ctx.lineTo(canvas.width, canvasY);
                    ctx.stroke();
                }
            }
            
            ctx.restore();
        }
        
        function updateLegend() {
            const legend = document.getElementById('legend');
            legend.innerHTML = '';
            
            if (currentView === 'optimization') {
                legend.innerHTML = \`
                    <div class="legend-item">
                        <div class="legend-color" style="background: #10b981;"></div>
                        <span>Optimized</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #3b82f6;"></div>
                        <span>Success Report</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #f97316;"></div>
                        <span>Failed Report</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #ef4444;"></div>
                        <span>Not Optimized</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #1a1a1a;"></div>
                        <span>Empty Land</span>
                    </div>
                \`;
            } else if (currentView === 'reports') {
                legend.innerHTML = \`
                    <div class="legend-item">
                        <div class="legend-color" style="background: #3b82f6;"></div>
                        <span>Success Report</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #f97316;"></div>
                        <span>Failed Report</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #6b7280;"></div>
                        <span>No Report</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #1a1a1a;"></div>
                        <span>Empty Land</span>
                    </div>
                \`;
            } else {
                legend.innerHTML = \`
                    <div class="legend-item">
                        <div class="legend-color" style="background: #1a1a1a;"></div>
                        <span>Empty Land</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #667eea;"></div>
                        <span>Scene (colors vary)</span>
                    </div>
                \`;
            }
        }
        
        function getMousePos(e) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
        
        function getLandAtPos(mouseX, mouseY) {
            const x = Math.floor((mouseX - offsetX) / cellSize) + MIN_COORD;
            const y = MAX_COORD - Math.floor((mouseY - offsetY) / cellSize);
            
            if (x >= MIN_COORD && x <= MAX_COORD && y >= MIN_COORD && y <= MAX_COORD) {
                return { x, y, data: landsMap.get(x + ',' + y) };
            }
            return null;
        }
        
        canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                if (e.shiftKey) {
                    offsetX = dragOffsetX + (e.clientX - dragStartX);
                    offsetY = dragOffsetY + (e.clientY - dragStartY);
                    drawGrid();
                }
                return;
            }
            
            const pos = getMousePos(e);
            const land = getLandAtPos(pos.x, pos.y);
            
            if (land) {
                let info = \`Land: (\${land.x}, \${land.y})\`;
                if (land.data && land.data.sceneId) {
                    info += \` | Scene: \${land.data.sceneId}\`;
                    if (land.data.hasOptimizedAssets) {
                        info += ' | ✅ Optimized';
                    } else if (land.data.optimizationReport) {
                        info += land.data.optimizationReport.ok ? ' | 📊 Success Report' : ' | ⚠️ Failed Report';
                    } else {
                        info += ' | ❌ Not Optimized';
                    }
                } else {
                    info += ' | Empty';
                }
                infoPanel.textContent = info;
                canvas.style.cursor = land.data && land.data.sceneId ? 'pointer' : 'crosshair';
            }
        });
        
        canvas.addEventListener('mousedown', (e) => {
            if (e.shiftKey) {
                isDragging = true;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                dragOffsetX = offsetX;
                dragOffsetY = offsetY;
                canvas.style.cursor = 'grabbing';
            }
        });
        
        canvas.addEventListener('mouseup', (e) => {
            isDragging = false;
            canvas.style.cursor = 'crosshair';
        });
        
        canvas.addEventListener('click', async (e) => {
            if (e.shiftKey) return;
            
            const pos = getMousePos(e);
            const land = getLandAtPos(pos.x, pos.y);
            
            if (land && land.data && land.data.sceneId) {
                showReportModal(land.data);
            }
        });
        
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -1 : 1;
            const newSize = Math.max(1, Math.min(20, cellSize + delta));
            if (newSize !== cellSize) {
                cellSize = newSize;
                resizeCanvas();
                drawGrid();
            }
        });
        
        async function showReportModal(landData) {
            modal.style.display = 'block';
            modalTitle.textContent = \`Optimization Report - Scene \${landData.sceneId}\`;
            modalBody.innerHTML = '<div class="loading">Loading report...</div>';
            
            if (landData.optimizationReport && landData.optimizationReport.id) {
                try {
                    const response = await fetch(\`\${OPTIMIZATION_URL}/\${landData.optimizationReport.id}-report.json\`);
                    if (response.ok) {
                        const reportData = await response.json();
                        modalBody.innerHTML = \`
                            <h3>Status: \${reportData.success ? '✅ Success' : '❌ Failed'}</h3>
                            \${reportData.error ? \`<p style="color: red;">Error: \${reportData.error}</p>\` : ''}
                            <h4>Full Report:</h4>
                            <pre>\${syntaxHighlight(JSON.stringify(reportData, null, 2))}</pre>
                        \`;
                    } else {
                        modalBody.innerHTML = \`
                            <p>Report status: \${landData.optimizationReport.ok ? 'Success' : 'Failed'}</p>
                            \${landData.optimizationReport.err ? \`<p>Error: \${landData.optimizationReport.err}</p>\` : ''}
                            <p style="color: #666;">Full report not available</p>
                        \`;
                    }
                } catch (error) {
                    modalBody.innerHTML = '<p style="color: red;">Error loading report</p>';
                }
            } else if (landData.hasOptimizedAssets) {
                modalBody.innerHTML = \`
                    <h3>✅ Scene has optimized assets</h3>
                    <p>Optimized mobile version is available at:</p>
                    <pre>\${OPTIMIZATION_URL}/\${landData.sceneId}-mobile.zip</pre>
                \`;
            } else {
                modalBody.innerHTML = \`
                    <h3>❌ No optimization data</h3>
                    <p>This scene has not been processed by the optimization pipeline.</p>
                \`;
            }
        }
        
        function syntaxHighlight(json) {
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                let cls = 'json-value';
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
        
        closeModal.onclick = function() {
            modal.style.display = 'none';
        };
        
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        };
        
        document.getElementById('viewScenes').addEventListener('click', () => {
            currentView = 'scenes';
            document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
            document.getElementById('viewScenes').classList.add('active');
            updateLegend();
            drawGrid();
        });
        
        document.getElementById('viewOptimization').addEventListener('click', () => {
            currentView = 'optimization';
            document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
            document.getElementById('viewOptimization').classList.add('active');
            updateLegend();
            drawGrid();
        });
        
        document.getElementById('viewReports').addEventListener('click', () => {
            currentView = 'reports';
            document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
            document.getElementById('viewReports').classList.add('active');
            updateLegend();
            drawGrid();
        });
        
        document.getElementById('zoomIn').addEventListener('click', () => {
            cellSize = Math.min(20, cellSize + 2);
            resizeCanvas();
            drawGrid();
        });
        
        document.getElementById('zoomOut').addEventListener('click', () => {
            cellSize = Math.max(1, cellSize - 2);
            resizeCanvas();
            drawGrid();
        });
        
        document.getElementById('resetView').addEventListener('click', () => {
            cellSize = 3;
            offsetX = 0;
            offsetY = 0;
            resizeCanvas();
            drawGrid();
        });
        
        document.getElementById('downloadMap').addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = \`decentraland-world-map-\${Date.now()}.png\`;
            link.href = canvas.toDataURL();
            link.click();
        });
        
        resizeCanvas();
        updateLegend();
        drawGrid();
    </script>
</body>
</html>`;
}