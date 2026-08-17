# 🎨 Dashboard Design Guidelines (디자인 지침)

본 지침서는 `@uam/dashboard` 애플리케이션의 **컬러 시스템(Color System & Tokens)** 및 **카드 컴포넌트 규격(Card & Nested Card Styles)**을 정의하는 공식 디자인 가이드라인입니다. 모든 대시보드 UI 컴포넌트 개발 시 본 가이드라인을 일관되게 준수해야 합니다.

---

## 1. 컬러 팔레트 & 톤앤매너 (Color Palette & Tokens)

본 시스템은 **Main Theme Color (Teal 또는 Indigo)**와 **Secondary Theme (Amber, Rose, Slate)**의 조화로운 조화를 기반으로, 직관적인 시각적 비계(Visual Scaffolding)와 실시간 상태 전달을 최우선으로 합니다.

### 1.1 테마 색상 구성표

| 구 분 | Tailwind Class | HEX / Color Code | 대표 활용처 |
| :--- | :--- | :--- | :--- |
| **Main Theme (Primary)** | `teal-500` / `teal-600`<br>`indigo-600` | `#0d9488` / `#0f766e`<br>`#4f46e5` | 메인 강조 액센트, 성공/완료 상태, 차트 주요 지표, 브랜드 액션 버튼 |
| **Secondary (Amber)** | `amber-500` / `amber-50` | `#f59e0b` / `#fffbeb` | 주의/경고 상태, 연속 데이터(Streak), 진행 중 아이템, 보조 강조 |
| **Secondary (Rose)** | `rose-600` / `rose-50` | `#e11d48` / `#fff1f2` | 오류/위험 상태, 삭제/해제 confirmation, 이탈 및 알림 팝업 |
| **Secondary (Slate)** | `slate-50` ~ `slate-900` | `#f8fafc` ~ `#0f172a` | 기본 앱 배경(`slate-50`), 내비게이션(`slate-800`), 텍스트 및 기본 테두리 |

---

### 1.2 디자인 토큰 매핑 가이드

#### 텍스트 & 백그라운드 토큰
* **App Level Background**: `bg-slate-50` (차분하고 모던한 연회색 바탕)
* **Sidebar / Dark Container**: `bg-slate-800` (대비감을 주는 짙은 내비게이션 배경)
* **Primary Text**: `text-gray-900` 또는 `text-slate-800` (높은 가독성의 본문)
* **Secondary / Muted Text**: `text-gray-500` / `text-gray-400` (보조 설명, 라벨, 타임스탬프)
* **Numeric / Code Text**: `font-mono` 적용 (수치, ID, 시간, 렌더링 수치 정렬용)

#### 상태 인디케이터 배지 (Status Badges)
| 상태 종류 | 배지 배경/테두리 | 텍스트/포인트 | 예시 기능 |
| :--- | :--- | :--- | :--- |
| **정상 / 완료** | `bg-teal-50 border-teal-200` | `text-teal-700` | 실시간 연동 완료, 정상 가동 |
| **진행 중 / 대기** | `bg-indigo-50 border-indigo-200` | `text-indigo-700` | 데이터 신호 수신 중, 연결 중 |
| **주의 / 지연** | `bg-amber-50 border-amber-200` | `text-amber-700` | 모니터링 주의, 시간 지연 |
| **위험 / 오류** | `bg-rose-50 border-rose-200` | `text-rose-700` | 접속 끊김, 경고 발생, 삭제 확인 |

---

## 2. 카드 컴포넌트 디자인 규격 (Card System)

대시보드의 데이터 시각화 및 리스트 인터페이스는 **Outer Card (기본 카드)**와 **Nested Card (카드 인 카드)**의 2단계 위계 구조로 설계합니다.

---

### 2.1 기본 카드 규격 (Outer / Main Card)

모든 주요 대시보드 섹션 및 독립 패널의 기본 컨테이너 규격입니다.

```tsx
// Outer / Main Card 표준 Tailwind Class
className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs"
```

#### 세부 디자인 토큰 규칙
* **Background**: `bg-white` (순백색)
* **Border**: `border border-gray-200` (1px 은은한 회색 라인)
* **Border Radius**: `rounded-xl` (12px 라운딩)
* **Padding**: `p-4` (모바일/기본) 또는 `p-5` (대형 패널)
* **Shadow**: `shadow-xs` (과도하지 않은 부드러운 하단 입체감)

---

### 2.2 카드 인 카드 규격 (Nested / Sub Card)

기본 카드 내부에서 individual item, 리스트 항목, 서브 모듈, 세부 상태를 나열할 때 사용하는 내포된 카드 규격입니다.

```tsx
// Nested Card (Sub-item Card) 표준 Tailwind Class
className="bg-gray-50 border border-gray-100 rounded-lg p-3.5 shadow-2xs hover:border-teal-200 transition-all duration-200 relative group"
```

#### 세부 디자인 토큰 규칙
* **Background**: `bg-gray-50` (약간의 명도 차이를 주는 밝은 회색 연출)
* **Border**: `border border-gray-100`
* **Border Radius**: `rounded-lg` (8px 라운딩 — 메인 카드의 12px보다 작게 적용하여 위계 표현)
* **Padding**: `p-3.5` (14px 다소 밀도 높은 피팅)
* **Shadow**: `shadow-2xs`
* **Hover Interaction**: `hover:border-teal-200 transition-all duration-200` (마우스 오버 시 메인 테마 색상 경계선 강조)

---

## 3. 코드 구현 예시 (React & Tailwind CSS)

### 3.1 Outer Card + Nested Cards 패턴 구현

```tsx
import React from 'react';
import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

export const DensityMonitorPanel: React.FC = () => {
  return (
    {/* 1. Outer / Main Card */}
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
      
      {/* Main Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-800">UAM 밀도 모니터링 구역</h2>
          <span className="text-xs text-gray-400 font-mono font-normal">(3개 구역)</span>
        </div>
        
        {/* Status Badge */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 border border-teal-200 text-teal-700">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          실시간 스트리밍
        </span>
      </div>

      {/* 2. Nested Cards List Container */}
      <div className="space-y-3">
        
        {/* Sub-item Card 1: 정상 상태 */}
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3.5 shadow-2xs hover:border-teal-200 transition-all duration-200 relative group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-semibold text-gray-700 bg-gray-200/80 px-2 py-0.5 rounded">
              ZONE-A01
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              <CheckCircle2 className="w-3 h-3 text-teal-500" />
              정상 밀도 (42%)
            </span>
          </div>
          <h3 className="text-sm font-bold text-gray-900">여의도 버티포트 진입로</h3>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-2.5 pt-2.5 border-t border-gray-200/70">
            <span className="text-[11px] text-gray-400">최대 허용 기체 수</span>
            <span className="font-mono font-semibold text-gray-700">12 / 30 대</span>
          </div>
        </div>

        {/* Sub-item Card 2: 주의 상태 */}
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3.5 shadow-2xs hover:border-amber-200 transition-all duration-200 relative group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-semibold text-gray-700 bg-gray-200/80 px-2 py-0.5 rounded">
              ZONE-B04
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <Activity className="w-3 h-3 text-amber-500" />
              밀도 혼잡 주의 (78%)
            </span>
          </div>
          <h3 className="text-sm font-bold text-gray-900">강남 코엑스 회랑 상공</h3>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-2.5 pt-2.5 border-t border-gray-200/70">
            <span className="text-[11px] text-gray-400">최대 허용 기체 수</span>
            <span className="font-mono font-semibold text-amber-600">23 / 30 대</span>
          </div>
        </div>

        {/* Sub-item Card 3: 위험 상태 */}
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3.5 shadow-2xs hover:border-rose-200 transition-all duration-200 relative group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-semibold text-gray-700 bg-gray-200/80 px-2 py-0.5 rounded">
              ZONE-C02
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              <AlertCircle className="w-3 h-3 text-rose-500" />
              밀도 초과 경보 (95%)
            </span>
          </div>
          <h3 className="text-sm font-bold text-gray-900">김포공항 수송 경로</h3>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-2.5 pt-2.5 border-t border-gray-200/70">
            <span className="text-[11px] text-gray-400">최대 허용 기체 수</span>
            <span className="font-mono font-semibold text-rose-600">29 / 30 대</span>
          </div>
        </div>

      </div>
    </div>
  );
};
```

---

## 4. 디자인 규격 요약 체크리스트 (Summary Checklist)

- [ ] **메인 컬러(Main Theme)**: Accent 및 브랜드 영역에 `teal` (또는 `indigo`) 계열을 일관되게 사용하였는가?
- [ ] **보조 컬러(Secondary Theme)**: 주의(`amber`), 위험(`rose`), 기본 구조(`slate`) 규칙에 맞게 상태 색상을 지정하였는가?
- [ ] **기본 카드(Main Card)**: Outer 컨테이너에 `bg-white border border-gray-200 rounded-xl p-4 shadow-xs` 클래스를 적용하였는가?
- [ ] **카드 인 카드(Nested Card)**: Inner 컨테이너에 `bg-gray-50 border border-gray-100 rounded-lg p-3.5 shadow-2xs`와 hover 스타일을 적용하였는가?
- [ ] **폰트 및 피드백 모션**: 수치/ID/시각에 `font-mono`를 사용하고 실시간 활성 상태에 `animate-pulse` 배지를 활용하였는가?
