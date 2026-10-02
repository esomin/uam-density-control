import type { UamVehicleStatus } from '@uam/types';
import { AlertCircle, BatteryCharging, MapPin, Navigation } from 'lucide-react';
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
      className={`flex flex-col justify-between h-full rounded-lg p-2.5 transition-all duration-200 relative group border ${
        isFirstEmergency
          ? 'first-emergency-card shadow-md ring-1 ring-status-emergency/30'
          : uamEmergency
            ? 'border-status-emergency bg-status-emergency-bg dark:bg-status-emergency-dark-bg shadow-2xs'
            : uam.waitingForLanding
              ? 'border-status-waiting bg-status-waiting-bg dark:bg-status-waiting-dark-bg shadow-2xs'
              : 'border-main-primary/50 bg-main-primary-bg/20 shadow-2xs'
      }`}
    >
      <div>
        {/* Card Header: Rank, UAM ID, Status Badge */}
        <div className="flex items-center justify-between gap-1 mb-1.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-[10px] font-mono font-bold text-gray-400 shrink-0">#{index + 1}</span>
            <span
              className={`font-mono text-[11px] font-bold truncate ${
                uamEmergency
                  ? 'text-status-emergency-text'
                  : uam.waitingForLanding
                    ? 'text-status-waiting-text'
                    : 'text-main-primary-text'
              }`}
            >
              {uam.uamId}
            </span>
            {uamEmergency && <AlertCircle className="text-status-emergency animate-pulse w-3 h-3 shrink-0" />}
          </div>

          {uam.waitingForLanding ? (
            <Badge variant="waiting" size="xs">
              WAITING
            </Badge>
          ) : (
            <Badge variant="flight" size="xs">
              EN ROUTE
            </Badge>
          )}
        </div>

        {/* Card Metrics: Battery & Telemetry */}
        <div className="flex flex-col gap-1.5 my-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
              <BatteryCharging size={13} className={uam.batteryPercent < 20 ? 'text-red-500 animate-pulse' : 'text-emerald-500'} />
              <span className="font-medium">BATTERY</span>
            </span>
            <span className="font-mono font-bold text-gray-700 dark:text-zinc-200">
              {uam.batteryPercent.toFixed(1)}%
            </span>
          </div>
          
          <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-zinc-400 font-mono">
            <span className="flex items-center gap-1 min-w-0">
              <MapPin size={11} className="shrink-0 text-gray-400" />
              <span className="truncate">
                {uam.latitude.toFixed(3)}, {uam.longitude.toFixed(3)}
              </span>
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Navigation size={11} className="shrink-0 text-gray-400" />
              <span>ALT {uam.altitude.toFixed(0)}m</span>
            </span>
          </div>
        </div>
      </div>

      <button
        className="w-full h-7 text-[11px] font-semibold mt-1 text-white border-0 shadow-2xs transition-colors rounded flex items-center justify-center cursor-pointer shrink-0 tracking-wide uppercase font-mono bg-slate-700 hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-950 dark:border dark:border-slate-800"
        onClick={() => onApprove(uam)}
      >
        Approve
      </button>
    </div>
  );
}
