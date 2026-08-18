import type { UamVehicleStatus } from '@uam/types';

export const EMERGENCY_BATTERY_THRESHOLD = 20;

export const VERTIPORT_LAT = 37.5133;
export const VERTIPORT_LNG = 127.1028;
export const CRUISE_SPEED_MS = 150_000 / 3600; // 150 km/h → m/s (~41.7 m/s)

export function isEmergency(uam: UamVehicleStatus): boolean {
  return uam.batteryPercent < EMERGENCY_BATTERY_THRESHOLD;
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface EtaEntry {
  uam: UamVehicleStatus;
  rank: number;
  etaMin: number;       // 버티포트까지 소요 시간 (분)
  distKm: number;       // 남은 거리 (km)
  isWaiting: boolean;   // waitingForLanding
  arrivalTime: string;  // 도착 예상 시각
  isUamEmergency: boolean; // 긴급 상태 여부
}

export function computeEtaList(uams: UamVehicleStatus[], maxCount = 10): EtaEntry[] {
  const now = new Date();
  return uams.slice(0, maxCount).map((uam, i) => {
    const distM = haversineMeters(uam.latitude, uam.longitude, VERTIPORT_LAT, VERTIPORT_LNG);
    const distKm = distM / 1000;
    // waitingForLanding 기체는 호버링 중 → 자체 하강 시간(~1.5분) 만 소요
    const etaMin = uam.waitingForLanding
      ? 1.5
      : Math.round((distM / CRUISE_SPEED_MS) / 60);
    const arrival = new Date(now.getTime() + etaMin * 60_000);
    const arrivalTime = arrival.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return {
      uam,
      rank: i + 1,
      etaMin,
      distKm,
      isWaiting: !!uam.waitingForLanding,
      arrivalTime,
      isUamEmergency: isEmergency(uam),
    };
  });
}
