import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { UamVehicleStatus } from '@uam/types';

export interface LandedRecord {
  uamId: string;
  landedAt: string;
}

const socket = io(
  import.meta.env.VITE_WS_URL ||
    (typeof window !== 'undefined' && window.location.port === '5173'
      ? 'http://localhost:3002'
      : undefined)
);

export function useUamData() {
  /** [Stream B] Redis top-10 → 착륙 승인 큐 렌더링용 */
  const [uams, setUams] = useState<UamVehicleStatus[]>([]);
  const [displayedUams, setDisplayedUams] = useState<UamVehicleStatus[]>([]);

  /** [Stream A] MQTT raw 최신 50개 → 지도(Map3D) 렌더링용 */
  const [mapUams, setMapUams] = useState<UamVehicleStatus[]>([]);

  const [landedUams, setLandedUams] = useState<LandedRecord[]>([]);
  const [isQueueLocked, setIsQueueLocked] = useState(false);

  /** 시뮬레이션 환경 초기화 오버레이 상태 */
  const [isResetting, setIsResetting] = useState(false);
  const [resetDuration, setResetDuration] = useState(4000);

  const isQueueLockedRef = useRef(isQueueLocked);
  useEffect(() => {
    isQueueLockedRef.current = isQueueLocked;
  }, [isQueueLocked]);

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

    // 시뮬레이션 환경 초기화 이벤트
    socket.on('simulation:resetting', (data?: { duration?: number }) => {
      const duration = data?.duration || 4000;
      setResetDuration(duration);
      setIsResetting(true);
      setTimeout(() => {
        setIsResetting(false);
      }, duration);
    });

    return () => {
      socket.off('uam:update');
      socket.off('map:update');
      socket.off('landed:update');
      socket.off('simulation:resetting');
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

  const approveLanding = (uamId: string) => {
    socket.emit('landing:approve', { uamId });
  };

  return {
    uams,
    displayedUams,
    mapUams,
    landedUams,
    isQueueLocked,
    isResetting,
    resetDuration,
    pendingChangeCount,
    handleToggleLock,
    approveLanding,
  };
}
