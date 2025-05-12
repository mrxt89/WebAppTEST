import React from 'react';
import { BarChart } from 'lucide-react';

const PollFilter = ({ onFilterChange, active }) => {
  return (
    <button
      className={`flex items-center gap-1 p-2 rounded border ${
        active ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-100'
      }`}
      onClick={() => onFilterChange(active ? null : 'polls')}
      title={active ? 'Mostra tutti i messaggi' : 'Mostra solo i sondaggi'}
    >
      <BarChart className="h-4 w-4" />
      <span className="text-sm">Sondaggi</span>
      {active && (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
          ✓
        </span>
      )}
    </button>
  );
};

export default PollFilter;