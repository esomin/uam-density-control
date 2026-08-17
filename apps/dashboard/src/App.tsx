import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { UamVehicleStatus } from '@uam/types';
import {
  AlertCircle,
  BatteryFull,
  CalendarClock,
  CheckCircle2,
  List,
  Map as MapIcon,
  MapPin,
  Navigation,
  PlaneLanding,
  XCircle
} from "lucide-react";
import { Map3D } from './Map3D';
import { LandingPriorityMap } from './LandingPriorityMap';
import { Badge } from '@/components/Badge';

const socket = io('http://localhost:3002');

// 프론트엔드 긴급 상황 기준 (수동 착륙 유도)
const EMERGENCY_BATTERY_THRESHOLD = 20;

interface LandedRecord {
  uamId: string;
  landedAt: string;
}

type Tab = 'map' | 'list';

function App() {
  /** [Stream B] Redis top-10 → 착륙 승인 큐 렌더링용 */
  const [uams, setUams] = useState<UamVehicleStatus[]>([]);
  const [displayedUams, setDisplayedUams] = useState<UamVehicleStatus[]>([]);

  /** [Stream A] MQTT raw 최신 50개 → 지도(Map3D) 렌더링용 */
  const [mapUams, setMapUams] = useState<UamVehicleStatus[]>([]);

  const [landedUams, setLandedUams] = useState<LandedRecord[]>([]);
  const [pendingApproval, setPendingApproval] = useState<UamVehicleStatus | null>(null);
  const [isQueueLocked, setIsQueueLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('list');

  const isQueueLockedRef = useRef(isQueueLocked);
  useEffect(() => {
    isQueueLockedRef.current = isQueueLocked;
  }, [isQueueLocked]);

  // ── 자동 착륙 로직은 서버로 이관됨 (여기서는 상태만 렌더링) ──

  // 긴급 상태 판단 헬퍼 함수
  const isEmergency = useCallback((uam: UamVehicleStatus) => {
    return uam.batteryPercent < EMERGENCY_BATTERY_THRESHOLD;
  }, []);

  useEffect(() => {
    // [Stream B] 착륙 큐: Redis 우선순위 top-10
    socket.on('uam:update', (data: UamVehicleStatus[]) => {
      setUams(data);
      if (!isQueueLockedRef.current) {
        setDisplayedUams(data);
      }
    });

    // [Stream A] 지도용: MQTT raw 최신 50대
    socket.on('map:update', (data: UamVehicleStatus[]) => {
      setMapUams(data);
    });

    socket.on('landed:update', (data: LandedRecord[]) => {
      setLandedUams(data);
    });

    return () => {
      socket.off('uam:update');
      socket.off('map:update');
      socket.off('landed:update');
    };
  }, []);

  const handleToggleLock = (locked: boolean) => {
    setIsQueueLocked(locked);
    if (!locked) {
      setDisplayedUams(uams);
    }
  };


  // 잠금 중 백그라운드에서 변경된 기체 수 계산
  const pendingChangeCount = isQueueLocked
    ? uams.filter(u => {
      const matched = displayedUams.find(d => d.uamId === u.uamId);
      return !matched || matched.batteryPercent !== u.batteryPercent;
    }).length
    : 0;

  const handleApproveClick = (uam: UamVehicleStatus) => {
    setPendingApproval({ ...uam });
  };

  const handleConfirm = () => {
    if (!pendingApproval) return;
    const { uamId } = pendingApproval;
    socket.emit('landing:approve', { uamId });
    setPendingApproval(null);
  };

  const handleCancel = () => {
    setPendingApproval(null);
  };

  const formatLandedAt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const hasLanded = landedUams.length > 0;

  // ── ETA 계산 ──
  // 버티포트 좌표 (잠실 헤리패드 기준)
  const VERTIPORT_LAT = 37.5133;
  const VERTIPORT_LNG = 127.1028;
  const CRUISE_SPEED_MS = 150_000 / 3600; // 150 km/h → m/s (~41.7 m/s)

  function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6_371_000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  interface EtaEntry {
    uam: (typeof displayedUams)[0];
    rank: number;
    etaMin: number;       // 버티포트까지 소요 시간 (분)
    distKm: number;       // 남은 거리 (km)
    isWaiting: boolean;   // waitingForLanding
    arrivalTime: string;  // 도착 예상 시각
    isUamEmergency: boolean; // 렌더링 최적화
  }

  const now = new Date();
  // 우선순위 기체 최대 10대 표시 (Priority Zone 상위 3 + Standby Queue 7)
  const etaList: EtaEntry[] = displayedUams.slice(0, 10).map((uam, i) => {
    const distM = haversineMeters(uam.latitude, uam.longitude, VERTIPORT_LAT, VERTIPORT_LNG);
    const distKm = distM / 1000;
    // waitingForLanding 기체는 호버링 중 → 자체 하강 시간(~1.5분) 만 소요
    const etaMin = uam.waitingForLanding
      ? 1.5
      : Math.round((distM / CRUISE_SPEED_MS) / 60);
    const arrival = new Date(now.getTime() + etaMin * 60_000);
    const arrivalTime = arrival.toLocaleTimeString('ko-KR', {
      hour: '2-digit', minute: '2-digit'
    });
    return {
      uam,
      rank: i + 1,
      etaMin,
      distKm,
      isWaiting: !!uam.waitingForLanding,
      arrivalTime,
      isUamEmergency: isEmergency(uam)
    };
  });

  // 타임라인 최대 ETA(분) — 스케일 기준
  const maxEtaMin = Math.max(...etaList.map(e => e.etaMin), 1);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 flex flex-col font-sans overflow-hidden">
      {/* ── 헤더 (Light Navigation Container) ── */}
      <div className="bg-white text-gray-900 px-8 pt-5 pb-0 border-b border-gray-200 shadow-xs flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">UAM Real-Time Control Dashboard</h1>
            {hasLanded && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 border border-teal-200 text-teal-700 shadow-2xs">
                <PlaneLanding size={14} className="text-teal-600" />
                착륙 완료 {landedUams.length}대
              </span>
            )}
          </div>
        </div>

        {/* ── 탭 버튼 ── */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-150 border-b-2 ${activeTab === 'list'
              ? 'border-teal-600 text-teal-700 bg-teal-50/70 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/70 rounded-t-lg'
              }`}
          >
            <List size={16} />
            착륙 우선순위 기체
            {displayedUams.length > 0 && (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold ${activeTab === 'list' ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'
                }`}>
                {displayedUams.length}
              </span>
            )}
            {hasLanded && (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold ${activeTab === 'list' ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'
                }`}>
                착륙 {landedUams.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-150 border-b-2 ${activeTab === 'map'
              ? 'border-teal-600 text-teal-700 bg-teal-50/70 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/70 rounded-t-lg'
              }`}
          >
            <MapIcon size={16} />
            비행 중 기체
            {mapUams.length > 0 && (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold ${activeTab === 'map' ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'
                }`}>
                {mapUams.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── 탭 콘텐츠 (App Level Canvas: bg-slate-50 with Outer & Nested Cards) ── */}
      <div className="flex flex-1 overflow-hidden p-6 gap-6">

        {/* ── 탭: 착륙 우선순위 기체 목록 + 맵 + 타임라인 ── */}
        {activeTab === 'list' && (
          <div className="flex flex-1 overflow-hidden gap-6" style={{ minWidth: 0 }}>

            {/* 좌측 패널: Outer Card — 착륙 우선순위 기체 목록 (스크롤) */}
            <div className="flex flex-col flex-[2] min-w-0 bg-white border border-gray-200 rounded-xl p-5 shadow-xs overflow-y-auto">

              {/* 헤더: 타이틀 및 실시간/잠금 토글 */}
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <Navigation size={18} className="text-teal-600" />
                    착륙 우선순위 ({displayedUams.length}대)
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  {isQueueLocked && pendingChangeCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 animate-pulse">
                      백그라운드 {pendingChangeCount}대 변경 중
                    </span>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className={`text-xs font-medium transition-colors duration-200 ${isQueueLocked ? 'text-amber-700 font-semibold' : 'text-gray-500'}`}>
                      {isQueueLocked ? '잠금 중' : '실시간'}
                    </span>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isQueueLocked}
                        onChange={(e) => handleToggleLock(e.target.checked)}
                      />
                      <div className="w-8 h-4 bg-gray-300 rounded-full peer peer-checked:bg-amber-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                    </div>
                  </label>
                </div>
              </div>

              {/* ── Zone A: 상위 3대 — Priority Zone ── */}
              {displayedUams.slice(0, 3).length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-bold tracking-wider text-teal-700 uppercase font-mono">Priority Zone</span>
                    <div className="flex-1 h-px bg-teal-100" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 items-stretch">
                    {displayedUams.slice(0, 3).map((uam, index) => {
                      const isLowBattery = uam.batteryPercent < EMERGENCY_BATTERY_THRESHOLD;
                      const uamEmergency = isEmergency(uam);
                      return (
                        <div
                          key={uam.uamId}
                          className={`flex flex-col justify-between h-full rounded-lg p-3.5 shadow-2xs transition-all duration-200 relative group border ${uamEmergency
                            ? 'bg-rose-50/80 border-rose-200 hover:border-rose-300'
                            : uam.waitingForLanding
                              ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                              : 'bg-gray-50 border-gray-100 hover:border-teal-300'
                            }`}
                        >
                          <div>
                            {/* Nested Card Header */}
                            <div className="flex items-center justify-between gap-1 mb-2 min-w-0">
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-[11px] font-mono font-bold text-gray-500 shrink-0">#{index + 1}</span>
                                <Badge variant="neutral" size="sm" className="truncate font-mono font-bold">
                                  {uam.uamId}
                                </Badge>
                                {uamEmergency && <AlertCircle className="text-rose-500 animate-pulse w-4 h-4 shrink-0" />}
                              </div>

                              {uamEmergency ? (
                                <Badge variant="emergency">Emergency</Badge>
                              ) : uam.waitingForLanding ? (
                                <Badge variant="waiting">착륙 대기</Badge>
                              ) : (
                                <Badge variant="flight">비행 중</Badge>
                              )}
                            </div>

                            {/* Nested Card Content */}
                            <div className="flex flex-col gap-1 my-2">
                              <p className="flex items-center gap-2 text-sm text-gray-700">
                                <BatteryFull className={isLowBattery ? 'text-rose-600 shrink-0' : 'text-teal-600 shrink-0'} size={15} />
                                <span className={`font-mono ${isLowBattery ? 'text-rose-600 font-bold' : ''}`}>
                                  배터리 {uam.batteryPercent.toFixed(1)}%
                                </span>
                              </p>
                              <p className="text-[11px] text-gray-500 font-mono whitespace-nowrap truncate">
                                {uam.latitude.toFixed(4)}, {uam.longitude.toFixed(4)} · {uam.altitude.toFixed(0)}m
                              </p>
                            </div>
                          </div>

                          <button
                            className={`w-full h-8 text-xs font-semibold mt-3 text-white border-0 shadow-2xs transition-colors rounded-lg flex items-center justify-center cursor-pointer shrink-0 ${uamEmergency
                              ? 'bg-rose-600 hover:bg-rose-700'
                              : uam.waitingForLanding
                                ? 'bg-amber-600 hover:bg-amber-700'
                                : 'bg-slate-700 hover:bg-slate-800'
                              }`}
                            onClick={() => handleApproveClick(uam)}
                          >
                            착륙 승인
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Zone B: 4~10위 — Standby Queue ── */}
              {displayedUams.slice(3).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase font-mono">Standby Queue</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 items-stretch">
                    {displayedUams.slice(3).map((uam, i) => {
                      const index = i + 3;
                      const isLowBattery = uam.batteryPercent < 20;
                      const uamEmergency = isEmergency(uam);
                      return (
                        <div
                          key={uam.uamId}
                          className={`flex flex-col justify-between h-full rounded-lg p-3.5 shadow-2xs transition-all duration-200 relative group border ${uamEmergency
                            ? 'bg-rose-50/80 border-rose-200 hover:border-rose-300'
                            : uam.waitingForLanding
                              ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                              : 'bg-gray-50 border-gray-100 hover:border-teal-300'
                            }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-2 min-w-0">
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-[11px] font-mono font-bold text-gray-500 shrink-0">#{index + 1}</span>
                                <Badge variant="neutral" size="sm" className="truncate font-mono font-bold">
                                  {uam.uamId}
                                </Badge>
                                {uamEmergency && <AlertCircle className="text-rose-500 animate-pulse w-4 h-4 shrink-0" />}
                              </div>

                              {uamEmergency ? (
                                <Badge variant="emergency">Emergency</Badge>
                              ) : uam.waitingForLanding ? (
                                <Badge variant="waiting">착륙 대기</Badge>
                              ) : (
                                <Badge variant="flight">비행 중</Badge>
                              )}
                            </div>

                            <div className="flex flex-col gap-1 my-2">
                              <p className="flex items-center gap-2 text-sm text-gray-700">
                                <BatteryFull className={isLowBattery ? 'text-rose-600 shrink-0' : 'text-teal-600 shrink-0'} size={15} />
                                <span className={`font-mono ${isLowBattery ? 'text-rose-600 font-bold' : ''}`}>
                                  배터리 {uam.batteryPercent.toFixed(1)}%
                                </span>
                              </p>
                              <p className="text-[11px] text-gray-500 font-mono whitespace-nowrap truncate">
                                {uam.latitude.toFixed(4)}, {uam.longitude.toFixed(4)} · {uam.altitude.toFixed(0)}m
                              </p>
                            </div>
                          </div>

                          <button
                            className={`w-full h-8 text-xs font-semibold mt-3 text-white border-0 shadow-2xs transition-colors rounded-lg flex items-center justify-center cursor-pointer shrink-0 ${uamEmergency
                              ? 'bg-rose-600 hover:bg-rose-700'
                              : uam.waitingForLanding
                                ? 'bg-amber-600 hover:bg-amber-700'
                                : 'bg-slate-700 hover:bg-slate-800'
                              }`}
                            onClick={() => handleApproveClick(uam)}
                          >
                            착륙 승인
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── 가운데 패널: Outer Card — 착륙 우선순위 기체 맵 ── */}
            <div className="flex-[3] min-w-0 bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden relative flex flex-col">
              <LandingPriorityMap uams={displayedUams} />
            </div>

            {/* ── 우측 패널: Outer Card — ETA Landing Sequence Timeline ── */}
            <div className="flex-[1] min-w-0 bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col overflow-hidden">

              {/* 타임라인 헤더 */}
              <div className="pb-3 mb-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <CalendarClock size={16} className="text-teal-600" />
                  LANDING SEQUENCE
                  <span className="ml-auto text-xs font-normal text-gray-400 font-mono">
                    {etaList.length}대 추적 중
                  </span>
                </h2>
                <p className="text-[11px] text-gray-400 mt-1">
                  버티포트 기준 · 크루즈 150km/h 적용
                </p>
              </div>

              {/* 타임라인 본문 */}
              <div className="flex-1 overflow-y-auto pr-1">
                {etaList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                    <CalendarClock size={28} className="opacity-30" />
                    <span className="text-xs font-medium">추적 중인 기체 없음</span>
                  </div>
                ) : (
                  <div className="relative">

                    {/* NOW 인디케이터 */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-bold text-teal-700 font-mono w-8 text-right flex-shrink-0">NOW</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-teal-500 ring-2 ring-teal-200 flex-shrink-0" />
                      <div className="flex-1 h-px bg-gradient-to-r from-teal-300 to-transparent" />
                      <span className="text-[10px] text-teal-700 font-mono flex-shrink-0 font-bold">
                        {now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="absolute left-[2.1rem] top-7 bottom-6 w-px bg-gray-200" />

                    {/* 기체 목록 */}
                    <div className="flex flex-col gap-2.5">
                      {etaList.map((entry) => {
                        const isTop3 = entry.rank <= 3;
                        const barWidth = Math.max(8, Math.round((entry.etaMin / maxEtaMin) * 100));

                        return (
                          <div key={entry.uam.uamId} className="flex items-start gap-2">
                            {/* 시간 레이블 */}
                            <span className={`text-[10px] w-8 text-right flex-shrink-0 font-mono pt-2 font-semibold ${entry.isWaiting ? 'text-amber-600' : 'text-gray-500'}`}>
                              {entry.isWaiting ? '~1m' : `+${entry.etaMin}m`}
                            </span>

                            {/* 노드 점 */}
                            <div className="flex-shrink-0 pt-1.5 z-10">
                              <div className={`w-2.5 h-2.5 rounded-full border-2 transition-all duration-300 ${entry.isUamEmergency
                                ? 'bg-rose-500 border-rose-300'
                                : entry.isWaiting
                                  ? 'bg-amber-500 border-amber-300 ring-2 ring-amber-200'
                                  : isTop3
                                    ? 'bg-teal-500 border-teal-300'
                                    : 'bg-gray-400 border-gray-300'
                                }`} />
                            </div>

                            {/* 컨텐츠 카드 (Nested Card style) */}
                            <div className={`flex-1 rounded-lg border p-2.5 transition-all duration-200 shadow-2xs ${entry.isUamEmergency
                              ? 'border-rose-200 bg-rose-50/70'
                              : entry.isWaiting
                                ? 'border-amber-200 bg-amber-50/60'
                                : isTop3
                                  ? 'border-teal-100 bg-teal-50/40'
                                  : 'border-gray-100 bg-gray-50'
                              }`}>
                              {/* 최상단: 순위 + ID + 상태 */}
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="text-[10px] font-bold text-gray-400 font-mono">#{entry.rank}</span>
                                <span className={`font-mono text-xs font-bold flex-1 truncate ${entry.isUamEmergency ? 'text-rose-700'
                                  : entry.isWaiting ? 'text-amber-700'
                                    : isTop3 ? 'text-teal-800'
                                      : 'text-gray-700'
                                  }`}>
                                  {entry.uam.uamId}
                                  {entry.isUamEmergency && <AlertCircle size={10} className="inline ml-1 text-rose-500 animate-pulse" />}
                                </span>
                              {entry.isWaiting ? (
                                <Badge variant="waiting">착륙 대기</Badge>
                              ) : (
                                <Badge variant="flight">비행 중</Badge>
                              )}
                              </div>

                              {/* ETA 바 + 도착 시각 */}
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${entry.isUamEmergency ? 'bg-rose-500'
                                      : entry.isWaiting ? 'bg-amber-500'
                                        : isTop3 ? 'bg-teal-500'
                                          : 'bg-gray-400'
                                      }`}
                                    style={{ width: `${barWidth}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-gray-600 font-mono font-medium flex-shrink-0">
                                  {entry.arrivalTime}
                                </span>
                              </div>

                              {!entry.isWaiting && (
                                <span className="text-[10px] text-gray-500 font-mono mt-1 block">
                                  {entry.distKm.toFixed(1)} km
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 버티포트 도착점 */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[10px] font-bold text-teal-700 font-mono w-8 text-right flex-shrink-0">VTPT</span>
                      <div className="w-2.5 h-2.5 rounded-sm bg-teal-600 flex-shrink-0" />
                      <div className="flex-1 h-px bg-teal-200" />
                      <span className="text-[10px] text-teal-700 font-mono font-bold">Jamsil VP</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 하단 착륙 완료 로그 */}
              {hasLanded && (
                <div className="border-t border-gray-100 pt-3 mt-3 max-h-[160px] overflow-y-auto">
                  <h3 className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-mono">
                    <PlaneLanding size={12} className="text-teal-600" />
                    착륙 완료 로그
                    <span className="ml-auto text-teal-700 font-bold">{landedUams.length}대</span>
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {landedUams.map((record, idx) => (
                      <div
                        key={`${record.uamId}-${record.landedAt}`}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[11px] transition-all duration-300 ${idx === 0
                          ? 'border-teal-200 bg-teal-50/80 text-teal-800 shadow-2xs font-semibold'
                          : 'border-gray-100 bg-gray-50 text-gray-600'
                          }`}
                      >
                        <CheckCircle2 size={12} className={idx === 0 ? 'text-teal-600' : 'text-gray-400'} />
                        <span className="font-mono font-bold flex-1 truncate">{record.uamId}</span>
                        <span className="font-mono text-gray-500">{formatLandedAt(record.landedAt)}</span>
                        {idx === 0 && <span className="text-teal-500">●</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 탭: 지도 전체 뷰 ── */}
        {activeTab === 'map' && (
          <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden relative">
            <Map3D uams={mapUams} />
          </div>
        )}
      </div>

      {/* ── 착륙 승인 확인 모달 (Elevated Light Modal Spec) ── */}
      {pendingApproval && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
          onClick={handleCancel}
        >
          <div
            className="bg-white border border-gray-200 rounded-2xl p-8 w-[420px] shadow-2xl text-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              {isEmergency(pendingApproval) ? (
                <AlertCircle className="text-rose-600 w-7 h-7 animate-pulse" />
              ) : (
                <Navigation className="text-teal-600 w-7 h-7" />
              )}
              <h2 className={`text-xl font-bold ${isEmergency(pendingApproval) ? 'text-rose-600' : 'text-teal-600'}`}>
                착륙 승인 확인
              </h2>
            </div>

            <p className="text-gray-500 text-sm mb-4">
              아래 기체의 착륙을 승인합니다. 정보를 확인하세요.
            </p>

            <div className={`rounded-xl p-5 mb-2 border ${isEmergency(pendingApproval) ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="font-mono text-2xl font-bold text-gray-900 mb-3">
                {pendingApproval.uamId}
              </p>

              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <BatteryFull
                    size={16}
                    className={pendingApproval.batteryPercent < 20 ? 'text-rose-600' : 'text-teal-600'}
                  />
                  <span className={pendingApproval.batteryPercent < 20 ? 'text-rose-600 font-bold' : 'text-gray-700'}>
                    배터리: {pendingApproval.batteryPercent.toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  <span className="text-gray-700 font-mono">
                    좌표: {pendingApproval.latitude.toFixed(4)}, {pendingApproval.longitude.toFixed(4)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Navigation size={16} className="text-gray-400" />
                  <span className="text-gray-700 font-mono">
                    고도: {pendingApproval.altitude.toFixed(0)}m
                  </span>
                </div>

                {isEmergency(pendingApproval) && (
                  <div className="flex items-center gap-2 mt-1">
                    <AlertCircle size={16} className="text-rose-600 animate-pulse" />
                    <span className="text-rose-600 font-bold">비상 상황 기체</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-6 text-center">
              * 이 정보는 승인 버튼을 클릭한 시점의 스냅샷입니다.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                id="modal-cancel-btn"
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 font-medium text-sm h-10 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                onClick={handleCancel}
              >
                <XCircle size={16} className="mr-2" />
                취소
              </button>
              <button
                id="modal-confirm-btn"
                className={`flex-1 font-bold text-sm h-10 text-white shadow-2xs rounded-lg flex items-center justify-center cursor-pointer transition-colors ${isEmergency(pendingApproval) ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-600 hover:bg-teal-700'}`}
                onClick={handleConfirm}
              >
                <CheckCircle2 size={16} className="mr-2" />
                최종 승인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;