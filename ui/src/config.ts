// Centralized configuration for the UI

// API URLs
export const CONFIG = {
  // Base URL for optimization assets (reports, optimized files, etc.)
  OPTIMIZATION_API_URL: 'https://optimized-assets.dclexplorer.com/v2',

  // Base URL for report data (R2 storage)
  REPORTS_API_URL: 'https://reports.dclexplorer.com',

  // Report data path
  REPORT_DATA_PATH: 'optimization-pipeline/report.json',
} as const;

// Derived URLs
export const URLS = {
  // Full URL for fetching report data
  get reportData() {
    return `${CONFIG.REPORTS_API_URL}/${CONFIG.REPORT_DATA_PATH}`;
  },

  // Get scene report URL
  getSceneReport(sceneId: string) {
    return `${CONFIG.OPTIMIZATION_API_URL}/${sceneId}-report.json`;
  },

  // Get optimized asset URL
  getOptimizedAsset(sceneId: string) {
    return `${CONFIG.OPTIMIZATION_API_URL}/${sceneId}-mobile.zip`;
  },
} as const;
