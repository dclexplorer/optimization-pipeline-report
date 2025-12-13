import { formatPercentage } from '../utils/formatters';

interface ProgressBarProps {
  percentage: number;
}

export function ProgressBar({ percentage }: ProgressBarProps) {
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${percentage}%` }}>
        {formatPercentage(percentage)} Optimized
      </div>
    </div>
  );
}
