export interface ViewToggleProps {
  view: 'cards' | 'table';
  onViewChange: (view: 'cards' | 'table') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex bg-[#1f1f1f] rounded-lg p-0.5">
      <button
        onClick={() => onViewChange('cards')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          view === 'cards'
            ? 'bg-[#ff6b35] text-white'
            : 'text-[#777] hover:text-white'
        }`}
      >
        Cards
      </button>
      <button
        onClick={() => onViewChange('table')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          view === 'table'
            ? 'bg-[#ff6b35] text-white'
            : 'text-[#777] hover:text-white'
        }`}
      >
        Table
      </button>
    </div>
  );
}
