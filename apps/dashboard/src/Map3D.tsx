import { useEffect, useRef, useState } from 'react';
import Map, { Marker, NavigationControl, Source, type MapRef } from 'react-map-gl/maplibre';

import 'maplibre-gl/dist/maplibre-gl.css';
import type { UamVehicleStatus } from '@uam/types';
import maplibregl from 'maplibre-gl';
import { useTranslation } from '@/hooks/useTranslation';

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY as string;
const MAP_STYLE = `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_API_KEY}`;

const TERRAIN_SPEC = {
  source: 'terrain-source',
  exaggeration: 2.0,
};

// 서울 주요 버티포트 거점
const VERTIPORTS = [
  { name: '잠실', key: 'jamsil', lat: 37.513, lng: 127.108, isTarget: true },
  { name: '여의도', key: 'yeouido', lat: 37.525, lng: 126.924, isTarget: false },
  { name: '수서', key: 'suseo', lat: 37.488, lng: 127.123, isTarget: false },
];

interface Map3DProps {
  uams: UamVehicleStatus[];
  isActive?: boolean;
}

export function Map3D({ uams, isActive = true }: Map3DProps) {
  const { t } = useTranslation();
  const mapRef = useRef<MapRef | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // 탭이 활성화될 때 맵 뷰포트 크기 강제 재계산
  useEffect(() => {
    if (isActive && mapRef.current) {
      const map = mapRef.current.getMap();
      if (map) {
        requestAnimationFrame(() => {
          map.resize();
        });
      }
    }
  }, [isActive]);

  return (
    <div className="w-full h-full min-h-[350px] relative bg-slate-950">
      {/* ── 맵 초기 로딩 오버레이 (반쪽 화면 깜빡임 완벽 차단) ── */}
      {!isLoaded && (
        <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-teal-500/20 rounded-full animate-ping" />
            <div className="absolute w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-[11px] font-mono text-teal-400 font-semibold tracking-wider animate-pulse">
            {t.mapInitializing}
          </span>
        </div>
      )}

      <Map
        ref={mapRef}
        mapLib={maplibregl}
        initialViewState={{
          longitude: 127.100,
          latitude: 37.513,
          zoom: 12,
          bearing: -15,
          pitch: 55,
        }}
        maxPitch={85}
        mapStyle={MAP_STYLE}
        terrain={TERRAIN_SPEC}
        onLoad={() => {
          setIsLoaded(true);
          mapRef.current?.getMap()?.resize();
        }}
        onError={(e) => console.error('Map initialization error:', e)}
      >
        <Source
          id="terrain-source"
          type="raster-dem"
          url={`https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_API_KEY}`}
          tileSize={512}
        />

        <NavigationControl position="top-right" />

        {/* 버티포트 마커 */}
        {VERTIPORTS.map((vp) => (
          <Marker key={vp.key} longitude={vp.lng} latitude={vp.lat} anchor="bottom">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* 핀 모양 아이콘 */}
              <div
                title={`${vp.name} 버티포트`}
                style={{
                  width: vp.isTarget ? 20 : 14,
                  height: vp.isTarget ? 20 : 14,
                  borderRadius: '50% 50% 50% 0',
                  transform: 'rotate(-45deg)',
                  backgroundColor: vp.isTarget ? '#f97316' : '#a78bfa',
                  border: `2px solid ${vp.isTarget ? '#c2410c' : '#7c3aed'}`,
                }}
              />
              <div
                style={{
                  marginTop: 4,
                  fontSize: vp.isTarget ? 11 : 9,
                  color: vp.isTarget ? '#f97316' : '#c4b5fd',
                  fontWeight: vp.isTarget ? 700 : 400,
                  background: 'rgba(0,0,0,0.6)',
                  padding: '1px 4px',
                  borderRadius: 3,
                  whiteSpace: 'nowrap',
                }}
              >
                {vp.isTarget ? `★ ${vp.name}` : vp.name}
              </div>
            </div>
          </Marker>
        ))}

        {/* UAM 마커 */}
        {uams.map((uam) => {
          const size = 10 + Math.min(uam.altitude / 200, 14); // 고도에 따라 크기 조절
          return (
            <Marker
              key={uam.uamId}
              longitude={uam.longitude}
              latitude={uam.latitude}
              anchor="center"
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'all 0.2s ease-out',
                }}
              >
                <span className="text-[10px] bg-black/60 text-white px-1 rounded mb-1">
                  {uam.uamId}
                </span>

                <div
                  title={`${uam.uamId} | ${uam.altitude.toFixed(0)}m`}
                  style={{
                    width: size,
                    height: size,
                    backgroundColor: uam.waitingForLanding ? '#facc15' : '#38bdf8',
                    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', // 삼각형 모양
                    transform: `rotate(${uam.heading}deg)`, // 방향 반영
                    border: '1px solid white',
                    boxShadow: uam.waitingForLanding ? '0 0 15px #facc15' : 'none',
                  }}
                />
              </div>
            </Marker>
          );
        })}
      </Map>

      <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-zinc-800/90 border border-gray-200 dark:border-zinc-700 shadow-md backdrop-blur-md px-3 py-2 rounded-lg text-xs font-mono pointer-events-none flex flex-col gap-0.5">
        <span className="text-teal-700 dark:text-teal-400 font-bold">{t.radarActive}</span>
        <span className="text-gray-600 dark:text-zinc-300 font-mono">
          {t.radarTracking(uams.length, 50)}
        </span>
      </div>
    </div>
  );
}
