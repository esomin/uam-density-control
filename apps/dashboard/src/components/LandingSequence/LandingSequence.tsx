import type { UamVehicleStatus } from '@uam/types';
import { AlertCircle, CalendarClock, Plane } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { computeEtaList } from '@/utils/geo';
import type { LandedRecord } from '@/hooks/useUamData';
import { LandedLog } from './LandedLog';

interface LandingSequenceProps {
  displayedUams: UamVehicleStatus[];
  landedUams: LandedRecord[];
}

export function LandingSequence({ displayedUams, landedUams }: LandingSequenceProps) {
  const etaList = computeEtaList(displayedUams, 10);
  const maxDistKm = Math.max(...etaList.map((e) => e.distKm), 1);
  const now = new Date();

  return (
    <div className="flex-[1.2] min-w-0 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-xl pt-2.5 pb-2.5 pl-3 pr-0 shadow-xs flex flex-col overflow-hidden">
      {/* 타임라인 헤더 */}
      <div className="pb-2 mb-2 border-b border-gray-100 dark:border-zinc-600 flex-shrink-0 pr-3">
        <h2 className="text-xs font-bold text-gray-800 dark:text-zinc-100 flex items-center gap-1.5 font-mono uppercase tracking-wider">
          <CalendarClock size={15} className="text-main-primary-text" />
          LANDING SEQUENCE
          <span className="ml-auto text-[11px] font-normal text-gray-400 font-mono">
            {etaList.length} TRACKING
          </span>
        </h2>
        <p className="text-[10px] text-gray-400 mt-0.5 font-mono uppercase tracking-wider">
          Vertiport Base · Cruise 150km/h
        </p>
      </div>

      {/* 타임라인 본문 (카드와 스크롤바 사이 안쪽 여백 확보) */}
      <div className="flex-1 overflow-y-auto pr-4 pl-0 custom-scrollbar">
        {etaList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <CalendarClock size={24} className="opacity-30" />
            <span className="text-xs font-medium">No tracking UAMs</span>
          </div>
        ) : (
          <div className="relative">
            {/* NOW 인디케이터 */}
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[9px] font-bold text-main-primary-text font-mono w-7 text-right flex-shrink-0">
                NOW
              </span>
              <div className="w-2 h-2 rounded-full bg-main-primary ring-2 ring-main-primary-bg flex-shrink-0" />
              <div className="flex-1 h-px bg-gradient-to-r from-main-primary to-transparent" />
              <span className="text-[9px] text-main-primary-text font-mono flex-shrink-0 font-bold">
                {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
            </div>
            <div className="absolute left-[1.9rem] top-6 bottom-5 w-px bg-gray-200 dark:bg-zinc-600" />

            {/* 기체 목록 */}
            <div className="flex flex-col gap-1.5">
              {etaList.map((entry, index) => (
                <div key={entry.uam.uamId} className="flex flex-col gap-1.5">
                  {index === 0 && (
                    <div className="flex items-center gap-1.5 mb-0.5 ml-9">
                      <span className="text-[9px] font-bold tracking-wider text-main-primary-text uppercase font-mono">
                        Priority Zone
                      </span>
                      <div className="flex-1 h-px bg-main-primary-bg" />
                    </div>
                  )}
                  {index === 3 && (
                    <div className="flex items-center gap-1.5 mt-1.5 mb-0.5 ml-9">
                      <span className="text-[9px] font-bold tracking-wider text-gray-500 uppercase font-mono">
                        Standby Queue
                      </span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-600" />
                    </div>
                  )}
                  <div className="flex items-start gap-1.5">
                    {/* 시간 레이블 */}
                    <span
                      className={`text-[9px] w-7 text-right flex-shrink-0 font-mono pt-1.5 ${entry.isWaiting ? 'text-gray-900 dark:text-zinc-100 font-bold' : 'text-gray-400 dark:text-zinc-400 font-medium'
                        }`}
                    >
                      {entry.isWaiting ? '~1m' : `+${entry.etaMin}m`}
                    </span>

                    {/* 노드 점 */}
                    <div className="flex-shrink-0 pt-1.5 z-10">
                      <div
                        className={`w-2 h-2 rounded-full border-2 transition-all duration-300 ${entry.isUamEmergency
                          ? 'bg-status-emergency border-status-emergency-border'
                          : entry.isWaiting
                            ? 'bg-status-waiting border-status-waiting-border'
                            : 'bg-main-primary border-main-primary'
                          }`}
                      />
                    </div>

                    {/* 컨텐츠 카드 (컴팩트 패딩) */}
                    <div
                      className={`flex-1 rounded-md border transition-all duration-200 px-2 py-1.5 shadow-2xs ${entry.isUamEmergency
                        ? 'border-status-emergency bg-status-emergency-bg dark:bg-status-emergency-dark-bg'
                        : entry.isWaiting
                          ? 'border-status-waiting bg-status-waiting-bg dark:bg-status-waiting-dark-bg'
                          : 'border-main-primary bg-main-primary-bg/30'
                        }`}
                    >
                      {/* 최상단: 순위 + ID + 상태 */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-400 font-mono">#{entry.rank}</span>
                        <span
                          className={`font-mono text-[11px] font-bold flex-1 truncate ${entry.isUamEmergency
                            ? 'text-status-emergency-text'
                            : entry.isWaiting
                              ? 'text-status-waiting-text'
                              : 'text-main-primary-text'
                            }`}
                        >
                          {entry.uam.uamId}
                          {entry.isUamEmergency && (
                            <AlertCircle size={9} className="inline ml-1 text-status-emergency animate-pulse" />
                          )}
                        </span>
                        {entry.isWaiting ? (
                          <Badge variant="waiting" size="xs">WAITING</Badge>
                        ) : (
                          <Badge variant="flight" size="xs">EN ROUTE</Badge>
                        )}
                      </div>

                      {/* 미니 슬라이더 타임라인 */}
                      <div className="my-1">
                        <div className="flex items-center justify-between text-[8.5px] text-gray-400 dark:text-zinc-400 font-mono mb-0.5">
                          <span>DEP</span>
                          <span className="text-gray-600 dark:text-zinc-200 font-semibold">{entry.arrivalTime} · ARR</span>
                        </div>
                        <div className="relative w-full h-3 flex items-center">
                          {/* 배경 트랙 선 */}
                          <div className="absolute left-0 right-0 h-1 bg-slate-200/60 dark:bg-zinc-600/60 rounded-full" />

                          {/* 채워진 트랙 선 */}
                          <div
                            className={`absolute left-0 h-1 rounded-full transition-all duration-700 ${entry.isUamEmergency
                              ? 'bg-status-emergency'
                              : entry.isWaiting
                                ? 'bg-status-waiting'
                                : 'bg-main-primary'
                              }`}
                            style={{
                              width: `${entry.isWaiting
                                ? 90
                                : Math.min(85, Math.max(5, Math.round((1 - entry.distKm / maxDistKm) * 85)))
                                }%`,
                            }}
                          />

                          {/* 버티포트 도착지점 */}
                          <div className="absolute right-0 w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-500" />

                          {/* 비행기 아이콘 */}
                          <div
                            className={`absolute -translate-x-1/2 transition-all duration-700 flex items-center justify-center ${entry.isUamEmergency
                              ? 'text-status-emergency'
                              : entry.isWaiting
                                ? 'text-status-waiting'
                                : 'text-main-primary'
                              }`}
                            style={{
                              left: `${entry.isWaiting
                                ? 90
                                : Math.min(85, Math.max(5, Math.round((1 - entry.distKm / maxDistKm) * 85)))
                                }%`,
                            }}
                          >
                            <Plane size={11} className="rotate-45 transform" />
                          </div>
                        </div>
                        {!entry.isWaiting && (
                          <div className="text-[8.5px] text-gray-400 dark:text-zinc-400 font-mono mt-0.5 text-center">
                            DIST: {entry.distKm.toFixed(1)} km
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 버티포트 도착점 */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[9px] font-bold text-main-primary-text font-mono w-7 text-right flex-shrink-0">
                VTPT
              </span>
              <div className="w-2 h-2 rounded-sm bg-main-primary flex-shrink-0" />
              <div className="flex-1 h-px bg-main-primary-bg" />
              <span className="text-[9px] text-main-primary-text font-mono font-bold">Jamsil VP</span>
            </div>
          </div>
        )}
      </div>

      {/* 하단 착륙 완료 로그 (컴팩트) */}
      <LandedLog landedUams={landedUams} />
    </div>
  );
}
