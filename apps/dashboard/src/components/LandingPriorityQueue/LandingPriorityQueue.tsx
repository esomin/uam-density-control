import type { UamVehicleStatus } from '@uam/types';
import { AlignJustify, Lock, Unlock } from 'lucide-react';
import { isEmergency } from '@/utils/geo';
import { UamCard } from './UamCard';

interface LandingPriorityQueueProps {
  displayedUams: UamVehicleStatus[];
  isQueueLocked: boolean;
  pendingChangeCount: number;
  onToggleLock: (locked: boolean) => void;
  onApprove: (uam: UamVehicleStatus) => void;
}

export function LandingPriorityQueue({
  displayedUams,
  isQueueLocked,
  pendingChangeCount,
  onToggleLock,
  onApprove,
}: LandingPriorityQueueProps) {
  const firstEmergencyUamId = displayedUams.find(uam => isEmergency(uam))?.uamId;
  const priorityZoneUams = displayedUams.slice(0, 3);
  const standbyQueueUams = displayedUams.slice(3);

  return (
    <div className="flex flex-col flex-[2.5] min-w-0 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-xl p-4 shadow-xs overflow-y-auto custom-scrollbar">
      {/* Header: Title and RealTime/Lock Toggle */}
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-gray-100 dark:border-zinc-600">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-800 dark:text-zinc-100 flex items-center gap-1.5 font-mono uppercase tracking-wider">
            <AlignJustify size={16} className="text-main-primary-text" />
            LANDING PRIORITY ({displayedUams.length} UAMs)
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          {isQueueLocked && pendingChangeCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-main-primary-bg border border-main-primary text-main-primary-text animate-pulse">
              {pendingChangeCount} Pending in Bg
            </span>
          )}

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <span
              className={`flex items-center gap-1 text-[11px] font-medium transition-colors duration-200 ${
                isQueueLocked ? 'text-main-primary-text font-semibold' : 'text-gray-500'
              }`}
            >
              {isQueueLocked ? <Lock size={11} className="text-main-primary" /> : <Unlock size={11} className="text-gray-400" />}
              {isQueueLocked ? 'Lock' : 'RealTime'}
            </span>
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isQueueLocked}
                onChange={(e) => onToggleLock(e.target.checked)}
              />
              <div className="w-7 h-3.5 bg-gray-300 rounded-full peer peer-checked:bg-main-primary after:content-[''] after:absolute after:top-[1.5px] after:left-[1.5px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:after:translate-x-3.5"></div>
            </div>
          </label>
        </div>
      </div>

      {/* ── Zone A: Top 3 — Priority Zone ── */}
      {priorityZoneUams.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold tracking-wider text-main-primary-text uppercase font-mono">
              Priority Zone
            </span>
            <div className="flex-1 h-px bg-main-primary-bg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 items-stretch">
            {priorityZoneUams.map((uam, index) => (
              <UamCard
                key={uam.uamId}
                uam={uam}
                index={index}
                isFirstEmergency={uam.uamId === firstEmergencyUamId}
                onApprove={onApprove}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Zone B: Rank 4~10 — Standby Queue ── */}
      {standbyQueueUams.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase font-mono">
              Standby Queue
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-600" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 items-stretch">
            {standbyQueueUams.map((uam, i) => {
              const index = i + 3;
              return (
                <UamCard
                  key={uam.uamId}
                  uam={uam}
                  index={index}
                  isFirstEmergency={uam.uamId === firstEmergencyUamId}
                  onApprove={onApprove}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
