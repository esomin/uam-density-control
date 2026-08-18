import { useEffect, useState } from 'react';
import { Activity, Plane, ShieldCheck } from 'lucide-react';

interface ResetOverlayProps {
  isVisible: boolean;
  duration?: number;
}

export function ResetOverlay({ isVisible, duration = 4000 }: ResetOverlayProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setProgress(0);
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const currentProgress = Math.min(100, Math.round((elapsed / duration) * 100));
        setProgress(currentProgress);
        if (elapsed >= duration) {
          clearInterval(interval);
        }
      }, 20);

      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isVisible, duration]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl bg-slate-900/40 dark:bg-black/45 transition-all duration-300 animate-in fade-in"
      style={{ pointerEvents: 'auto' }}
    >
      {/* ── 중앙 투명 글래스모피즘 HUD 카드 ── */}
      <div className="relative w-full max-w-lg mx-4 p-8 rounded-3xl bg-white/15 dark:bg-slate-900/35 backdrop-blur-2xl border border-white/30 dark:border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] text-center overflow-hidden font-sans">
        {/* 하이테크 레이더 앰비언트 글로우 */}
        <div className="absolute -top-28 -left-28 w-56 h-56 bg-sky-400/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -right-28 w-56 h-56 bg-teal-400/25 rounded-full blur-3xl pointer-events-none" />

        {/* 상단 기체 아이콘 & 펄스 효과 */}
        <div className="relative mb-6 flex justify-center items-center">
          <div className="relative w-16 h-16 rounded-2xl bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Plane size={26} className="text-teal-300 animate-pulse" />
          </div>
          {/* 레이더 펄스 링 */}
          <div className="absolute w-20 h-20 rounded-2xl border border-white/30 animate-ping pointer-events-none" style={{ animationDuration: '2s' }} />
        </div>

        {/* 제목 & 서브타이틀 */}

        <h2 className="text-2xl font-bold text-white tracking-tight mb-2 drop-shadow-md">
          항공 관제 시뮬레이션 환경 초기화 중
        </h2>
        <p className="text-xs text-white/90 font-mono mb-7 drop-shadow-xs">
          관제 대기열을 초기화하고 20대 UAM의 실시간 운항을 재개합니다.
        </p>

        {/* ── 프로그레스 바 ── */}
        <div className="relative mb-6">
          <div className="flex justify-between items-center text-[10px] font-mono text-white/80 mb-2 font-semibold">
            <span className="flex items-center gap-1.5 text-sky-200">
              <Activity size={12} className="animate-pulse text-sky-300" />
              <span>RE-SYNCHRONIZING</span>
            </span>
            <span className="font-bold text-white text-xs">{progress}%</span>
          </div>

          {/* 게이지 트랙 (투명 글래스) */}
          <div className="w-full h-3 bg-black/25 dark:bg-black/40 backdrop-blur-md border border-white/20 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-teal-300 to-indigo-400 shadow-[0_0_14px_rgba(56,189,248,0.7)] transition-all duration-75 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* ── 하단 3단계 상태 인디케이터 배지 (글래스모피즘 카드) ── */}
        <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-white/20 text-[11px] font-mono">
          <div
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl backdrop-blur-md transition-all duration-300 border ${progress > 30
                ? 'bg-teal-500/25 border-teal-300/60 text-white shadow-[0_0_12px_rgba(45,212,191,0.3)] font-bold'
                : 'bg-white/10 dark:bg-white/5 border-white/15 text-white/50'
              }`}
          >
            <ShieldCheck size={13} className={progress > 30 ? 'text-teal-300' : 'text-white/40'} />
            <span>관제 대기열 정리</span>
          </div>
          <div
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl backdrop-blur-md transition-all duration-300 border ${progress > 60
                ? 'bg-teal-500/25 border-teal-300/60 text-white shadow-[0_0_12px_rgba(45,212,191,0.3)] font-bold'
                : 'bg-white/10 dark:bg-white/5 border-white/15 text-white/50'
              }`}
          >
            <ShieldCheck size={13} className={progress > 60 ? 'text-teal-300' : 'text-white/40'} />
            <span>비행 경로 설정</span>
          </div>
          <div
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl backdrop-blur-md transition-all duration-300 border ${progress > 90
                ? 'bg-teal-500/25 border-teal-300/60 text-white shadow-[0_0_12px_rgba(45,212,191,0.3)] font-bold'
                : 'bg-white/10 dark:bg-white/5 border-white/15 text-white/50'
              }`}
          >
            <ShieldCheck size={13} className={progress > 90 ? 'text-teal-300' : 'text-white/40'} />
            <span>기체 20대 운항 시작</span>
          </div>
        </div>
      </div>
    </div>
  );
}
