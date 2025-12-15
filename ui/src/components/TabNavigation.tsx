import type { TabName } from '../types';

interface TabNavigationProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: { id: TabName; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'worlds', label: 'Worlds' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'ranking', label: 'Ranking' },
    { id: 'failing', label: 'Failing' },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
