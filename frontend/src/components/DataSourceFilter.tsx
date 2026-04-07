import { Database } from 'lucide-react';

interface DataSourceFilterProps {
  source: string;
  onSourceChange: (source: string) => void;
}

export default function DataSourceFilter({ source, onSourceChange }: DataSourceFilterProps) {
  const sources = [
    { value: 'all', label: 'All Sources', color: 'bg-blue-600' },
    { value: 'salessync', label: 'SalesSync', color: 'bg-indigo-600' },
    { value: 'fieldvibe', label: 'FieldVibe', color: 'bg-emerald-600' },
  ];

  return (
    <div className="flex items-center gap-2">
      <Database className="h-4 w-4 text-slate-500" />
      <span className="text-sm font-medium text-slate-600">Source:</span>
      <div className="flex rounded-lg overflow-hidden border border-slate-200">
        {sources.map((s) => (
          <button
            key={s.value}
            onClick={() => onSourceChange(s.value)}
            className={`px-3 py-1.5 text-xs font-medium transition-all ${
              source === s.value
                ? `${s.color} text-white`
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
