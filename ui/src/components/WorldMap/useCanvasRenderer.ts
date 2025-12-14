import { useCallback } from 'react';
import type { LandData, MapView } from '../../types';
import { COLORS, getColorForSceneIndex } from '../../utils/colors';

const WORLD_SIZE = 351;
const CELL_SIZE = 3;
const OFFSET = 175;

interface UseCanvasRendererOptions {
  lands: LandData[];
  sceneColorIndices: Record<string, number>;
  view: MapView;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

function getOptimizationColor(land: LandData): string {
  if (!land.sceneId) return COLORS.empty;
  if (land.hasOptimizedAssets) return COLORS.optimized;
  if (land.optimizationReport) {
    return land.optimizationReport.success ? COLORS.optimized : COLORS.failed;
  }
  return COLORS.notOptimized;
}

export function useCanvasRenderer({
  lands,
  sceneColorIndices,
  view,
  zoom,
  offsetX,
  offsetY,
}: UseCanvasRendererOptions) {
  const getColor = useCallback((land: LandData): string => {
    if (view === 'optimization') {
      return getOptimizationColor(land);
    }
    // scenes view
    if (!land.sceneId) return COLORS.empty;
    const colorIndex = sceneColorIndices[land.sceneId] ?? 0;
    return getColorForSceneIndex(colorIndex);
  }, [view, sceneColorIndices]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(offsetX, offsetY);

    // Draw lands
    for (const land of lands) {
      const x = (land.x + OFFSET) * CELL_SIZE;
      const y = (land.y + OFFSET) * CELL_SIZE;
      ctx.fillStyle = getColor(land);
      ctx.fillRect(x, y, CELL_SIZE - 0.5, CELL_SIZE - 0.5);
    }

    // Draw grid lines at center
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(OFFSET * CELL_SIZE, 0);
    ctx.lineTo(OFFSET * CELL_SIZE, WORLD_SIZE * CELL_SIZE);
    ctx.moveTo(0, OFFSET * CELL_SIZE);
    ctx.lineTo(WORLD_SIZE * CELL_SIZE, OFFSET * CELL_SIZE);
    ctx.stroke();

    ctx.restore();
  }, [lands, getColor, zoom, offsetX, offsetY]);

  const getCoordsFromMouse = useCallback((clientX: number, clientY: number, canvasRect: DOMRect) => {
    const x = (clientX - canvasRect.left) / zoom - offsetX;
    const y = (clientY - canvasRect.top) / zoom - offsetY;
    const landX = Math.floor(x / CELL_SIZE) - OFFSET;
    const landY = Math.floor(y / CELL_SIZE) - OFFSET;
    return { x: landX, y: landY };
  }, [zoom, offsetX, offsetY]);

  return { draw, getCoordsFromMouse };
}

export { CELL_SIZE, OFFSET, WORLD_SIZE };
