import { CheckCircle2, PlaneLanding } from 'lucide-react';
import type { LandedRecord } from '@/hooks/useUamData';

interface LandedLogProps {
  landedUams: LandedRecord[];
}

export function LandedLog({ landedUams }: LandedLogProps) {
  if (landedUams.length === 0) return null;

  const formatLandedAt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  return (
    <div className="border-t border-gray-100 dark:border-zinc-600 pt-2 mt-2 max-h-[110px] overflow-y-auto pr-3 custom-scrollbar flex-shrink-0">
      <h3 className="text-[10px] font-bold text-gray-600 dark:text-zinc-200 uppercase tracking-wider mb-1.5 flex items-center gap-1 font-mono">
        <PlaneLanding size={11} className="text-status-landed-text" />
        LANDED LOG
        <span className="ml-auto text-status-landed-text font-bold">{landedUams.length} LANDED</span>
      </h3>
      <div className="flex flex-col gap-1">
        {landedUams.map((record, idx) => (
          <div
            key={`${record.uamId}-${record.landedAt}`}
            className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] transition-all duration-300 ${
              idx === 0
                ? 'border-status-landed-border bg-status-landed-bg dark:bg-status-landed-dark-bg text-status-landed-text shadow-2xs font-semibold'
                : 'border-gray-100 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300'
            }`}
          >
            <CheckCircle2 size={11} className={idx === 0 ? 'text-status-landed' : 'text-gray-400'} />
            <span className="font-mono font-bold flex-1 truncate">{record.uamId}</span>
            <span className="font-mono text-gray-500 text-[9px]">{formatLandedAt(record.landedAt)}</span>
            {idx === 0 && <span className="text-status-landed">●</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
