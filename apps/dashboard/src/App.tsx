import { useState } from 'react';
import type { UamVehicleStatus } from '@uam/types';
import { useUamData } from './hooks/useUamData';
import { Header, type Tab } from './components/Header';
import { LandingPriorityQueue } from './components/LandingPriorityQueue/LandingPriorityQueue';
import { LandingPriorityMap } from './LandingPriorityMap';
import { LandingSequence } from './components/LandingSequence/LandingSequence';
import { Map3D } from './Map3D';
import { PipelineStreamTicker } from './components/PipelineStreamTicker';
import { ApprovalModal } from './components/ApprovalModal';
import { ResetOverlay } from './components/ResetOverlay';

function App() {
  const {
    displayedUams,
    mapUams,
    landedUams,
    isQueueLocked,
    isResetting,
    resetDuration,
    pendingChangeCount,
    handleToggleLock,
    approveLanding,
  } = useUamData();

  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [pendingApproval, setPendingApproval] = useState<UamVehicleStatus | null>(null);
  const [lastApprovedId, setLastApprovedId] = useState<string | null>(null);
  const [isStreamTickerOpen, setIsStreamTickerOpen] = useState(true);

  const handleApproveClick = (uam: UamVehicleStatus) => {
    setPendingApproval({ ...uam });
  };

  const handleConfirmApproval = () => {
    if (!pendingApproval) return;
    approveLanding(pendingApproval.uamId);
    setLastApprovedId(pendingApproval.uamId);
    setPendingApproval(null);
  };

  const handleCancelApproval = () => {
    setPendingApproval(null);
  };

  return (
    <div className="bg-slate-50 dark:bg-zinc-800 h-screen text-slate-800 dark:text-zinc-100 flex flex-col font-sans overflow-hidden">
      {/* ── 상단 헤더 & 탭 네비게이션 (우측 HUD 토글 스위치 포함) ── */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        displayedCount={displayedUams.length}
        landedCount={landedUams.length}
        mapCount={mapUams.length}
        isStreamTickerOpen={isStreamTickerOpen}
        onToggleStreamTicker={() => setIsStreamTickerOpen((prev) => !prev)}
      />

      {/* ── 탭 콘텐츠 영역 ── */}
      <div className="flex flex-1 overflow-hidden p-4 gap-3.5 flex-col">
        {/* ── 탭 1: 착륙 우선순위 기체 목록 + 맵 + 타임라인 (3단 패널) ── */}
        <div className={`flex flex-1 overflow-hidden flex-col gap-3.5 ${activeTab === 'list' ? 'flex' : 'hidden'}`}>
          {/* 상단 Live Pipeline Stream Bar (헤더 우측 버튼으로 토글됨) */}
          {isStreamTickerOpen && (
            <PipelineStreamTicker
              mapUams={mapUams}
              displayedUams={displayedUams}
              lastApprovedId={lastApprovedId}
            />
          )}

          <div className="flex flex-1 overflow-hidden gap-3.5" style={{ minWidth: 0 }}>
            {/* 좌측 패널: 착륙 우선순위 기체 목록 (Priority Zone + Standby Queue) */}
            <LandingPriorityQueue
              displayedUams={displayedUams}
              isQueueLocked={isQueueLocked}
              pendingChangeCount={pendingChangeCount}
              onToggleLock={handleToggleLock}
              onApprove={handleApproveClick}
            />

            {/* 가운데 패널: 착륙 우선순위 기체 맵 */}
            <div className="flex-[2.3] min-w-0 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-xl shadow-xs overflow-hidden relative flex flex-col">
              <LandingPriorityMap uams={displayedUams} />
            </div>

            {/* 우측 패널: ETA 착륙 순서 타임라인 & 착륙 완료 로그 */}
            <LandingSequence
              displayedUams={displayedUams}
              landedUams={landedUams}
            />
          </div>
        </div>

        {/* ── 탭 2: 지도 전체 3D 뷰 (DOM 유지로 탭 전환 시 깜빡임/반쪽 현상 방지) ── */}
        <div className={`flex-1 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-xl shadow-xs overflow-hidden relative ${activeTab === 'map' ? 'block' : 'hidden'}`}>
          <Map3D uams={mapUams} isActive={activeTab === 'map'} />
        </div>
      </div>

      {/* ── 착륙 승인 확인 모달 ── */}
      <ApprovalModal
        pendingApproval={pendingApproval}
        onConfirm={handleConfirmApproval}
        onCancel={handleCancelApproval}
      />

      {/* ── 시뮬레이션 환경 초기화 HUD 오버레이 ── */}
      <ResetOverlay
        isVisible={isResetting}
        duration={resetDuration}
      />
    </div>
  );
}

export default App;