import { useRef, useEffect, useMemo, useCallback, useState, MouseEvent } from 'react';
import type { LandData, MapView } from '../../types';
import { usePanZoom } from './usePanZoom';
import { useCanvasRenderer } from './useCanvasRenderer';

interface WorldMapProps {
  lands: LandData[];
  sceneColorIndices: Record<string, number>;
  view: MapView;
  onLandClick: (land: LandData) => void;
  onLandHover: (land: LandData | null, x: number, y: number) => void;
}

export function WorldMap({
  lands,
  sceneColorIndices,
  view,
  onLandClick,
  onLandHover,
}: WorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cursor, setCursor] = useState('grab');

  const {
    zoom,
    offsetX,
    offsetY,
    isDragging,
    zoomIn,
    zoomOut,
    resetZoom,
    handleMouseDown,
    handleMouseMove: panMouseMove,
    handleMouseUp,
    handleWheel,
  } = usePanZoom();

  const { draw, getCoordsFromMouse } = useCanvasRenderer({
    lands,
    sceneColorIndices,
    view,
    zoom,
    offsetX,
    offsetY,
  });

  // Create a map for quick land lookup
  const landMap = useMemo(() => {
    const map = new Map<string, LandData>();
    for (const land of lands) {
      map.set(`${land.x},${land.y}`, land);
    }
    return map;
  }, [lands]);

  // Draw on canvas when dependencies change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animationId = requestAnimationFrame(() => {
      draw(ctx);
    });

    return () => cancelAnimationFrame(animationId);
  }, [draw]);

  // Add wheel listener with passive: false to prevent page scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      handleWheel(e as unknown as React.WheelEvent<HTMLCanvasElement>);
    };

    canvas.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', wheelHandler);
    };
  }, [handleWheel]);

  const handleMouseMoveLocal = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    panMouseMove(e);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const coords = getCoordsFromMouse(e.clientX, e.clientY, rect);

    if (coords.x >= -175 && coords.x <= 175 && coords.y >= -175 && coords.y <= 175) {
      const land = landMap.get(`${coords.x},${coords.y}`);
      if (land && land.sceneId) {
        onLandHover(land, e.clientX, e.clientY);
      } else {
        onLandHover(null, 0, 0);
      }
    } else {
      onLandHover(null, 0, 0);
    }
  }, [panMouseMove, getCoordsFromMouse, landMap, onLandHover]);

  const handleDoubleClick = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const coords = getCoordsFromMouse(e.clientX, e.clientY, rect);
    const land = landMap.get(`${coords.x},${coords.y}`);

    if (land && land.sceneId) {
      onLandClick(land);
    }
  }, [getCoordsFromMouse, landMap, onLandClick]);

  const handleMouseLeave = useCallback(() => {
    setCursor('grab');
    onLandHover(null, 0, 0);
  }, [onLandHover]);

  const handleMouseUpLocal = useCallback(() => {
    handleMouseUp();
    setCursor('grab');
  }, [handleMouseUp]);

  const handleMouseDownLocal = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    handleMouseDown(e);
    setCursor('grabbing');
  }, [handleMouseDown]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'decentraland-world-map.png';
    link.href = canvas.toDataURL();
    link.click();
  }, []);

  // Update cursor based on dragging state
  useEffect(() => {
    setCursor(isDragging ? 'grabbing' : 'grab');
  }, [isDragging]);

  return (
    <div className="map-container">
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={975}
          height={975}
          style={{ cursor }}
          onMouseDown={handleMouseDownLocal}
          onMouseMove={handleMouseMoveLocal}
          onMouseUp={handleMouseUpLocal}
          onMouseLeave={handleMouseLeave}
          onDoubleClick={handleDoubleClick}
        />
      </div>

      <div className="controls">
        <div className="zoom-controls">
          <span className="zoom-label">Zoom:</span>
          <button className="control-btn" onClick={zoomIn}>+</button>
          <button className="control-btn" onClick={zoomOut}>-</button>
          <button className="control-btn" onClick={resetZoom}>Reset</button>
        </div>
        <button className="control-btn" onClick={handleDownload}>Download Map</button>
      </div>
    </div>
  );
}
