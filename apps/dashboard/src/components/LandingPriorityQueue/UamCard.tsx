import type { UamVehicleStatus } from '@uam/types';
import { AlertCircle, BatteryFull, MapPin, Navigation } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { isEmergency } from '@/utils/geo';

interface UamCardProps {
  uam: UamVehicleStatus;
  index: number;
  isFirstEmergency: boolean;
  onApprove: (uam: UamVehicleStatus) => void;
}

export function UamCard({ uam, index, isFirstEmergency, onApprove }: UamCardProps) {
  const uamEmergency = isEmergency(uam);

  return (
    <div
      className={`flex flex-col justify-between h-full rounded-lg p-3 transition-all duration-200 relative group border ${
        isFirstEmergency
          ? 'first-emergency-card shadow-md'
          : uamEmergency
            ? 'border-status-emergency bg-status-emergency-bg shadow-2xs'
            : uam.waitingForLanding
              ? 'border-status-waiting bg-status-waiting-bg dark:bg-status-waiting-dark-bg shadow-2xs'
              : 'border-main-primary bg-main-primary-bg/30 shadow-2xs'
      }`}
    >
      <div>
        {/* Nested Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-1 mb-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-[10px] font-mono font-bold text-gray-400 shrink-0">#{index + 1}</span>
            <span
              className={`font-mono text-xs font-bold truncate ${
                uamEmergency
                  ? 'text-status-emergency-text'
                  : uam.waitingForLanding
                    ? 'text-status-waiting-text'
                    : 'text-main-primary-text'
              }`}
            >
              {uam.uamId}
            </span>
            {uamEmergency && <AlertCircle className="text-status-emergency animate-pulse w-3.5 h-3.5 shrink-0" />}
          </div>

          {uam.waitingForLanding ? (
            <Badge variant="waiting" className="text-[10px] px-1 py-0.5">
              착륙 대기
            </Badge>
          ) : (
            <Badge variant="flight" className="text-[10px] px-1 py-0.5">
              비행 중
            </Badge>
          )}
        </div>

        {/* Nested Card Content */}
        <div className="flex flex-col gap-1 my-2">
          <p className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-zinc-200">
            <BatteryFull className="text-gray-400 dark:text-zinc-400 shrink-0" size={14} />
            <span className="font-mono font-bold whitespace-nowrap">
              배터리 {uam.batteryPercent.toFixed(1)}%
            </span>
          </p>
          <p className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-zinc-300 font-mono mt-0.5">
            <span className="flex items-center gap-1 min-w-0">
              <MapPin size={12} className="text-gray-400 dark:text-zinc-400 shrink-0" />
              <span className="truncate">
                {uam.latitude.toFixed(4)}, {uam.longitude.toFixed(4)}
              </span>
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Navigation size={12} className="text-gray-400 dark:text-zinc-400 shrink-0" />
              <span>{uam.altitude.toFixed(0)}m</span>
            </span>
          </p>
        </div>
      </div>

      <button
        className={`w-full h-8 text-xs font-semibold mt-3 text-white border-0 shadow-2xs transition-colors rounded-lg flex items-center justify-center cursor-pointer shrink-0 ${
          uamEmergency
            ? 'bg-status-emergency-action hover:bg-status-emergency-action-hover'
            : uam.waitingForLanding
              ? 'bg-status-waiting-action hover:bg-status-waiting-action-hover'
              : 'bg-slate-700 hover:bg-slate-800'
        }`}
        onClick={() => onApprove(uam)}
      >
        착륙 승인
      </button>
    </div>
  );
}
