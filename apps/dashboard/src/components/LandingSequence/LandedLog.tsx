import { CheckCircle2, PlaneLanding } from 'lucide-react';
import type { LandedRecord } from '@/hooks/useUamData';

interface LandedLogProps {
  landedUams: LandedRecord[];
}

export function LandedLog({ landedUams }: LandedLogProps) {
  if (landedUams.length === 0) return null;

  const formatLandedAt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="border-t border-gray-100 pt-3 mt-3 max-h-[160px] overflow-y-auto">
      <h3 className="text-[11px] font-bold text-gray-600 dark:text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-mono">
        <PlaneLanding size={12} className="text-status-landed-text" />
        착륙 완료 로그
        <span className="ml-auto text-status-landed-text font-bold">{landedUams.length}대</span>
      </h3>
      <div className="flex flex-col gap-1.5">
        {landedUams.map((record, idx) => (
          <div
            key={`${record.uamId}-${record.landedAt}`}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[11px] transition-all duration-300 ${
              idx === 0
                ? 'border-status-landed-border bg-status-landed-bg dark:bg-status-landed-dark-bg text-status-landed-text shadow-2xs font-semibold'
                : 'border-gray-100 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300'
            }`}
          >
            <CheckCircle2 size={12} className={idx === 0 ? 'text-status-landed' : 'text-gray-400'} />
            <span className="font-mono font-bold flex-1 truncate">{record.uamId}</span>
            <span className="font-mono text-gray-500">{formatLandedAt(record.landedAt)}</span>
            {idx === 0 && <span className="text-status-landed">●</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
