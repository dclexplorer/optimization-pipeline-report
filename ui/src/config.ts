// Centralized configuration for the UI

// Detect if running locally
const isLocalDev = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// API URLs
export const CONFIG = {
  // Base URL for optimization assets (reports, optimized files, etc.)
  OPTIMIZATION_API_URL: 'https://optimized-assets.dclexplorer.com/v2',

  // Base URL for report data (R2 storage) - use proxy for local dev
  REPORTS_API_URL: isLocalDev ? '/proxy-reports' : 'https://reports.dclexplorer.com',

  // Report data path
  REPORT_DATA_PATH: 'optimization-pipeline/report.json',

  // Vercel app URL (for API routes) - use empty string for local dev (Vite proxy handles it)
  VERCEL_APP_URL: isLocalDev ? '' : 'https://optimization-pipeline-report.vercel.app',

  // Worlds content server API
  WORLDS_API_URL: 'https://worlds-content-server.decentraland.org',
} as const;

// Derived URLs
export const URLS = {
  // Full URL for fetching report data
  get reportData() {
    return `${CONFIG.REPORTS_API_URL}/${CONFIG.REPORT_DATA_PATH}`;
  },

  // Full URL for fetching worlds list
  get worldsList() {
    return `${CONFIG.WORLDS_API_URL}/index`;
  },

  // Get scene report URL
  getSceneReport(sceneId: string) {
    return `${CONFIG.OPTIMIZATION_API_URL}/${sceneId}-report.json`;
  },

  // Get optimized asset URL
  getOptimizedAsset(sceneId: string) {
    return `${CONFIG.OPTIMIZATION_API_URL}/${sceneId}-mobile.zip`;
  },

  // Get monitoring status URL
  get monitoringStatus() {
    return `${CONFIG.VERCEL_APP_URL}/api/monitoring/status`;
  },
} as const;

// Export API base URL for direct use in components
export const API_BASE_URL = CONFIG.VERCEL_APP_URL;
