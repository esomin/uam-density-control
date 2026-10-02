import type { UamVehicleStatus } from '@uam/types';
import { AlertCircle, BatteryCharging, CheckCircle2, MapPin, Navigation, XCircle } from 'lucide-react';
import { isEmergency } from '@/utils/geo';

interface ApprovalModalProps {
  pendingApproval: UamVehicleStatus | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ApprovalModal({ pendingApproval, onConfirm, onCancel }: ApprovalModalProps) {
  if (!pendingApproval) return null;

  const emergency = isEmergency(pendingApproval);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 w-[310px] shadow-2xl text-gray-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          {emergency ? (
            <AlertCircle className="text-status-emergency-action w-4 h-4 animate-pulse shrink-0" />
          ) : (
            <Navigation className="text-main-primary-text w-4 h-4 shrink-0" />
          )}
          <h2 className={`text-sm font-bold font-mono uppercase tracking-wider ${emergency ? 'text-status-emergency-action' : 'text-main-primary-text'}`}>
            Approve Landing
          </h2>
        </div>

        <p className="text-gray-500 dark:text-zinc-400 text-[11px] mb-3 leading-tight">
          Confirm landing clearance for the selected vehicle.
        </p>

        <div
          className={`rounded-lg p-3 mb-2 border ${
            emergency
              ? 'bg-status-emergency-bg dark:bg-status-emergency-dark-bg border-status-emergency-border'
              : 'bg-gray-50 dark:bg-zinc-700/50 border-gray-200 dark:border-zinc-600'
          }`}
        >
          <p className="font-mono text-xs font-bold text-gray-900 dark:text-zinc-100 mb-1.5">
            {pendingApproval.uamId}
          </p>

          <div className="flex flex-col gap-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
                <BatteryCharging
                  size={12}
                  className={pendingApproval.batteryPercent < 20 ? 'text-status-emergency-action animate-pulse' : 'text-emerald-500'}
                />
                <span>BATTERY</span>
              </span>
              <span
                className={
                  pendingApproval.batteryPercent < 20
                    ? 'text-status-emergency-action font-mono font-bold'
                    : 'text-gray-700 dark:text-zinc-200 font-mono font-semibold'
                }
              >
                {pendingApproval.batteryPercent.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-zinc-400 font-mono">
              <span className="flex items-center gap-1 min-w-0">
                <MapPin size={11} className="shrink-0 text-gray-400" />
                <span>
                  {pendingApproval.latitude.toFixed(3)}, {pendingApproval.longitude.toFixed(3)}
                </span>
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <Navigation size={11} className="shrink-0 text-gray-400" />
                <span>ALT {pendingApproval.altitude.toFixed(0)}m</span>
              </span>
            </div>

            {emergency && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-status-emergency-action font-semibold">
                <AlertCircle size={11} className="animate-pulse shrink-0" />
                <span>EMERGENCY STATE DETECTED</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-[9.5px] text-gray-400 dark:text-zinc-500 mb-3 text-center font-mono">
          * Telemetry snapshot at time of request
        </p>

        <div className="flex gap-2 mt-3">
          <button
            id="modal-cancel-btn"
            className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-600 font-medium text-[11px] h-7.5 rounded flex items-center justify-center cursor-pointer transition-colors font-mono uppercase"
            onClick={onCancel}
          >
            <XCircle size={12} className="mr-1" />
            Cancel
          </button>
          <button
            id="modal-confirm-btn"
            className={`flex-1 font-bold text-[11px] h-7.5 text-white shadow-2xs rounded flex items-center justify-center cursor-pointer transition-colors font-mono uppercase ${
              emergency
                ? 'bg-status-emergency-action hover:bg-status-emergency-action-hover'
                : 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-950 dark:border dark:border-slate-800'
            }`}
            onClick={onConfirm}
          >
            <CheckCircle2 size={12} className="mr-1" />
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
