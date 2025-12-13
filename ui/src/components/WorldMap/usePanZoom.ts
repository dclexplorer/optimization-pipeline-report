import { useState, useCallback, useRef, MouseEvent } from 'react';

interface PanZoomState {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

interface UsePanZoomResult {
  zoom: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  handleMouseDown: (e: MouseEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (e: MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: () => void;
  handleWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
}

export function usePanZoom(): UsePanZoomResult {
  const [state, setState] = useState<PanZoomState>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const [isDraggingState, setIsDraggingState] = useState(false);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastOffset = useRef({ x: 0, y: 0 });

  const zoomIn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.2, 5),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.2, 0.5),
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setState({
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    });
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      isDragging.current = true;
      setIsDraggingState(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
      };
      lastOffset.current = {
        x: state.offsetX,
        y: state.offsetY,
      };
      e.currentTarget.style.cursor = 'grabbing';
    }
  }, [state.offsetX, state.offsetY]);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    if (isDragging.current) {
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;
      setState((prev) => ({
        ...prev,
        offsetX: lastOffset.current.x + deltaX / prev.zoom,
        offsetY: lastOffset.current.y + deltaY / prev.zoom,
      }));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    setIsDraggingState(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();

    // Mouse position relative to canvas
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

    setState((prev) => {
      const newZoom = Math.max(0.5, Math.min(5, prev.zoom * zoomFactor));

      // Calculate the world position under the mouse before zoom
      const worldX = mouseX / prev.zoom - prev.offsetX;
      const worldY = mouseY / prev.zoom - prev.offsetY;

      // Calculate new offset so the same world position stays under the mouse
      const newOffsetX = mouseX / newZoom - worldX;
      const newOffsetY = mouseY / newZoom - worldY;

      return {
        zoom: newZoom,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      };
    });
  }, []);

  return {
    ...state,
    isDragging: isDraggingState,
    zoomIn,
    zoomOut,
    resetZoom,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
  };
}
