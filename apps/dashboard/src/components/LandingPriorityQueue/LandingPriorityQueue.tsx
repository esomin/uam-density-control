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
    <div className="flex flex-col flex-[2.5] min-w-0 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-xl p-5 shadow-xs overflow-y-auto">
      {/* 헤더: 타이틀 및 실시간/잠금 토글 */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-800 dark:text-zinc-100 flex items-center gap-2 font-mono uppercase tracking-wider">
            <AlignJustify size={18} className="text-main-primary-text" />
            LANDING PRIORITY ({displayedUams.length} UAMs)
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {isQueueLocked && pendingChangeCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-main-primary-bg border border-main-primary text-main-primary-text animate-pulse">
              백그라운드 {pendingChangeCount}대 변경 중
            </span>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span
              className={`flex items-center gap-1 text-xs font-medium transition-colors duration-200 ${
                isQueueLocked ? 'text-main-primary-text font-semibold' : 'text-gray-500'
              }`}
            >
              {isQueueLocked ? <Lock size={12} className="text-main-primary" /> : <Unlock size={12} className="text-gray-400" />}
              {isQueueLocked ? 'Lock' : 'RealTime'}
            </span>
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isQueueLocked}
                onChange={(e) => onToggleLock(e.target.checked)}
              />
              <div className="w-8 h-4 bg-gray-300 rounded-full peer peer-checked:bg-main-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
            </div>
          </label>
        </div>
      </div>

      {/* ── Zone A: 상위 3대 — Priority Zone ── */}
      {priorityZoneUams.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold tracking-wider text-main-primary-text uppercase font-mono">
              Priority Zone
            </span>
            <div className="flex-1 h-px bg-main-primary-bg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
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

      {/* ── Zone B: 4~10위 — Standby Queue ── */}
      {standbyQueueUams.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase font-mono">
              Standby Queue
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
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
