import { AlignJustify, Map as MapIcon, PlaneLanding } from 'lucide-react';

export type Tab = 'map' | 'list';

interface HeaderProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  displayedCount: number;
  landedCount: number;
  mapCount: number;
}

export function Header({
  activeTab,
  setActiveTab,
  displayedCount,
  landedCount,
  mapCount,
}: HeaderProps) {
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
            <span>착륙 완료 {landedCount}대</span>
          </div>
        )}
      </div>

      {/* ── 탭 (Horizontal Navigation Bar) ── */}
      <div className="bg-white dark:bg-zinc-700 border-b border-gray-200/80 dark:border-zinc-600 shadow-2xs px-8 flex-shrink-0">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 py-3 px-1 text-sm font-semibold transition-all duration-150 border-b-2 cursor-pointer ${activeTab === 'list'
              ? 'border-main-primary text-main-primary font-bold'
              : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 hover:border-gray-300 dark:hover:border-zinc-500'
              }`}
          >
            <AlignJustify size={16} />
            <span>착륙 우선순위 기체</span>
            {displayedCount > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeTab === 'list'
                  ? 'bg-main-primary-bg text-main-primary-text'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                  }`}
              >
                {displayedCount}
              </span>
            )}
            {hasLanded && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeTab === 'list'
                  ? 'bg-status-landed-bg text-status-landed-text'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                  }`}
              >
                착륙 {landedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 py-3 px-1 text-sm font-semibold transition-all duration-150 border-b-2 cursor-pointer ${activeTab === 'map'
              ? 'border-main-primary text-main-primary font-bold'
              : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 hover:border-gray-300 dark:hover:border-zinc-500'
              }`}
          >
            <MapIcon size={16} />
            <span>비행 중 기체</span>
            {mapCount > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeTab === 'map'
                  ? 'bg-main-primary-bg text-main-primary-text'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                  }`}
              >
                {mapCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
