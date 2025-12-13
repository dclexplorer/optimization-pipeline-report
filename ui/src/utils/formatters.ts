export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function formatPercentage(num: number): string {
  return `${num.toFixed(1)}%`;
}

export function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

export function formatDate(timestamp: number | string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}
