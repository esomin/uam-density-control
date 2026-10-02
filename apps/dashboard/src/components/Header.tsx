import { AlignJustify, Map as MapIcon, PlaneLanding, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export type Tab = 'list' | 'map';

interface HeaderProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  displayedCount: number;
  landedCount: number;
  mapCount: number;
  isStreamTickerOpen?: boolean;
  onToggleStreamTicker?: () => void;
}

export function Header({
  activeTab,
  setActiveTab,
  displayedCount,
  landedCount,
  mapCount,
  isStreamTickerOpen = true,
  onToggleStreamTicker,
}: HeaderProps) {
  const { t } = useTranslation();
  const hasLanded = landedCount > 0;

  return (
    <>
      {/* ── 헤더 (Background: Main Color) ── */}
      <div className="bg-main-primary dark:bg-blue-900/10 text-white px-8 py-4 flex items-center justify-between shadow-sm dark:border-b dark:border-sky-950 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">UAM Density Control Dashboard</h1>
        </div>
        {hasLanded && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 border-white/30 dark:border-teal-400/40 text-white dark:text-teal-400 shadow-2xs">
            <PlaneLanding size={14} className="text-white dark:text-teal-400" />
            <span>{t.landedCompleted(landedCount)}</span>
          </div>
        )}
      </div>

      {/* ── 탭 (Horizontal Navigation Bar) ── */}
      <div className="bg-white dark:bg-zinc-700 border-b border-gray-200/80 dark:border-zinc-600 shadow-2xs px-8 flex items-center justify-between flex-shrink-0">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 py-3 px-1 text-sm font-semibold transition-all duration-150 border-b-2 cursor-pointer ${
              activeTab === 'list'
                ? 'border-main-primary text-main-primary font-bold'
                : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 hover:border-gray-300 dark:hover:border-zinc-500'
            }`}
          >
            <AlignJustify size={16} />
            <span>{t.landingPriorityVehicles}</span>
            {displayedCount > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'list'
                    ? 'bg-main-primary-bg text-main-primary-text'
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                }`}
              >
                {displayedCount}
              </span>
            )}
            {hasLanded && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'list'
                    ? 'bg-status-landed-bg text-status-landed-text'
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                }`}
              >
                {t.landingWaiting} {landedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 py-3 px-1 text-sm font-semibold transition-all duration-150 border-b-2 cursor-pointer ${
              activeTab === 'map'
                ? 'border-main-primary text-main-primary font-bold'
                : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 hover:border-gray-300 dark:hover:border-zinc-500'
            }`}
          >
            <MapIcon size={16} />
            <span>{t.inFlightVehicles}</span>
            {mapCount > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'map'
                    ? 'bg-main-primary-bg text-main-primary-text'
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                }`}
              >
                {mapCount}
              </span>
            )}
          </button>
        </div>

        {/* ── 우측 유틸리티 영역: 데이터 파이프라인 표시/숨김 접기/펼치기 버튼 ── */}
        {activeTab === 'list' && onToggleStreamTicker && (
          <button
            onClick={onToggleStreamTicker}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer border shadow-2xs ${
              isStreamTickerOpen
                ? 'bg-main-primary-bg text-main-primary-text border-main-primary/30 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-500/40'
                : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-gray-300 dark:border-zinc-500 hover:border-main-primary dark:hover:border-sky-400 hover:text-main-primary dark:hover:text-sky-300 hover:bg-slate-50 dark:hover:bg-zinc-750'
            }`}
            title={isStreamTickerOpen ? t.dataPipelineFold : t.dataPipelineUnfold}
          >
            <Activity
              size={13}
              className={isStreamTickerOpen ? 'text-main-primary dark:text-sky-400 animate-pulse' : 'text-main-primary dark:text-sky-400'}
            />
            <span>{t.dataPipeline}</span>
            {isStreamTickerOpen ? (
              <ChevronUp size={13} className="text-main-primary dark:text-sky-400 ml-0.5" />
            ) : (
              <ChevronDown size={13} className="text-slate-600 dark:text-zinc-300 ml-0.5" />
            )}
          </button>
        )}
      </div>
    </>
  );
}
