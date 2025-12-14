import type { MapView } from '../types';

interface ViewToggleProps {
  currentView: MapView;
  onViewChange: (view: MapView) => void;
}

const views: { id: MapView; label: string }[] = [
  { id: 'optimization', label: 'Optimization View' },
  { id: 'scenes', label: 'Scene View' },
];

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="view-toggle">
      {views.map((view) => (
        <button
          key={view.id}
          className={`control-btn ${currentView === view.id ? 'active' : ''}`}
          onClick={() => onViewChange(view.id)}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
