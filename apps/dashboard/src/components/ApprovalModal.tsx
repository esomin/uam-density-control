import type { UamVehicleStatus } from '@uam/types';
import { AlertCircle, BatteryFull, CheckCircle2, MapPin, Navigation, XCircle } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl p-6 w-[360px] shadow-2xl text-gray-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 mb-4">
          {emergency ? (
            <AlertCircle className="text-status-emergency-action w-5 h-5 animate-pulse" />
          ) : (
            <Navigation className="text-main-primary-text w-5 h-5" />
          )}
          <h2 className={`text-base font-bold ${emergency ? 'text-status-emergency-action' : 'text-main-primary-text'}`}>
            착륙 승인 확인
          </h2>
        </div>

        <p className="text-gray-500 dark:text-zinc-400 text-xs mb-4">
          아래 기체의 착륙을 승인합니다. 정보를 확인하세요.
        </p>

        <div
          className={`rounded-xl p-4 mb-2 border ${
            emergency
              ? 'bg-status-emergency-bg dark:bg-status-emergency-dark-bg border-status-emergency-border'
              : 'bg-gray-50 dark:bg-zinc-700/60 border-gray-200 dark:border-zinc-600'
          }`}
        >
          <p className="font-mono text-base font-bold text-gray-900 dark:text-zinc-100 mb-2">
            {pendingApproval.uamId}
          </p>

          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-2">
              <BatteryFull
                size={14}
                className={pendingApproval.batteryPercent < 20 ? 'text-status-emergency-action' : 'text-main-primary'}
              />
              <span
                className={
                  pendingApproval.batteryPercent < 20
                    ? 'text-status-emergency-action font-bold'
                    : 'text-gray-700 dark:text-zinc-200'
                }
              >
                배터리: {pendingApproval.batteryPercent.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-gray-400 dark:text-zinc-400" />
              <span className="text-gray-700 dark:text-zinc-200 font-mono">
                좌표: {pendingApproval.latitude.toFixed(4)}, {pendingApproval.longitude.toFixed(4)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Navigation size={14} className="text-gray-400 dark:text-zinc-400" />
              <span className="text-gray-700 dark:text-zinc-200 font-mono">
                고도: {pendingApproval.altitude.toFixed(0)}m
              </span>
            </div>

            {emergency && (
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle size={14} className="text-status-emergency-action animate-pulse" />
                <span className="text-status-emergency-action font-bold">비상 상황 기체</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-zinc-500 mb-6 text-center">
          * 이 정보는 승인 버튼을 클릭한 시점의 스냅샷입니다.
        </p>

        <div className="flex gap-3 mt-6">
          <button
            id="modal-cancel-btn"
            className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-600 font-medium text-xs h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            onClick={onCancel}
          >
            <XCircle size={14} className="mr-1.5" />
            취소
          </button>
          <button
            id="modal-confirm-btn"
            className={`flex-1 font-bold text-xs h-9 text-white shadow-2xs rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              emergency
                ? 'bg-status-emergency-action hover:bg-status-emergency-action-hover'
                : 'bg-main-primary hover:opacity-90'
            }`}
            onClick={onConfirm}
          >
            <CheckCircle2 size={14} className="mr-1.5" />
            최종 승인
          </button>
        </div>
      </div>
    </div>
  );
}
