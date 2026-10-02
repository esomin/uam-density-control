import { useMemo } from 'react';

export type Lang = 'ko' | 'en';

export const translations = {
  ko: {
    // Header
    landingPriorityVehicles: '착륙 우선순위 기체',
    landingWaiting: '착륙',
    inFlightVehicles: '비행 중 기체',
    dataPipeline: '데이터 파이프라인',
    dataPipelineFold: '데이터 파이프라인 바 접기',
    dataPipelineUnfold: '데이터 파이프라인 바 펼치기',
    landedCompleted: (n: number) => `착륙 완료 ${n}대`,

    // Common Badges & Labels
    waiting: '착륙 대기',
    enRoute: '비행 중',
    emergency: '비상 상황',
    approve: '착륙 승인',
    battery: '배터리',

    // Map HUD & Legend
    jamsilVertiport: '잠실 버티포트',
    mapHudTracking: (total: number, waiting: number) => `추적 ${total}대 · ${waiting}대 착륙 대기`,
    mapLegendEmergency: '비상',
    mapLegendWaiting: '착륙 대기',
    mapLegendTop3: '우선순위 TOP 3',
    mapLegendQueue: '대기열',
    radarActive: '3D 레이더 관제 활성화',
    radarTracking: (total: number, max: number) => `추적 ${total} / ${max} UAM`,
    mapInitializing: '3D 레이더 맵 초기화 중...',
  },
  en: {
    // Header
    landingPriorityVehicles: 'Landing Priority',
    landingWaiting: 'Landed',
    inFlightVehicles: 'In-Flight Active',
    dataPipeline: 'Data Pipeline',
    dataPipelineFold: 'Collapse Data Pipeline',
    dataPipelineUnfold: 'Expand Data Pipeline',
    landedCompleted: (n: number) => `${n} Landed`,

    // Common Badges & Labels
    waiting: 'WAITING',
    enRoute: 'EN ROUTE',
    emergency: 'EMERGENCY',
    approve: 'Approve',
    battery: 'BATTERY',

    // Map HUD & Legend
    jamsilVertiport: 'Jamsil Vertiport',
    mapHudTracking: (total: number, waiting: number) => `Tracking ${total} · ${waiting} Holding`,
    mapLegendEmergency: 'Emergency',
    mapLegendWaiting: 'Waiting for Landing',
    mapLegendTop3: 'Priority TOP 3',
    mapLegendQueue: 'Standby Queue',
    radarActive: '3D RADAR VIEW ACTIVE',
    radarTracking: (total: number, max: number) => `TRACKING ${total} / ${max} UAM`,
    mapInitializing: 'INITIALIZING 3D RADAR MAP...',
  },
} as const;

export function useTranslation() {
  const lang: Lang = useMemo(() => {
    if (typeof window === 'undefined') return 'en';
    const navLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'en';
    return navLang.toLowerCase().startsWith('ko') ? 'ko' : 'en';
  }, []);

  const t = translations[lang];

  return { lang, t };
}
