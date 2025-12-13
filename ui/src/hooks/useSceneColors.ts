import { useMemo } from 'react';
import { getColorForSceneIndex } from '../utils/colors';

export function useSceneColors(sceneColorIndices: Record<string, number>): Map<string, string> {
  return useMemo(() => {
    const colorMap = new Map<string, string>();
    for (const [sceneId, index] of Object.entries(sceneColorIndices)) {
      colorMap.set(sceneId, getColorForSceneIndex(index));
    }
    return colorMap;
  }, [sceneColorIndices]);
}
