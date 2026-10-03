# UAM Density Control - 착륙 아키텍처 리팩토링 문서

본 문서는 UAM 관제 시스템의 긴급 자동 착륙(Emergency Auto-Landing) 및 정상 수동 착륙 과정을 개선한 아키텍처 리팩토링의 전후 차이점을 정리한 문서입니다.

## 1. 리팩토링 배경 (기존 문제점)
초기 프로토타입에서는 대시보드(Frontend)가 주도권을 쥐고 긴급 상황을 감지하여 타이머를 돌리고 강제로 착륙 승인(Approve) 이벤트를 전송하는 구조였습니다.
이로 인해 다음과 같은 치명적인 문제점이 발생했습니다.
- **안전성 결여 (Fail-Safe 부재):** 관제사 브라우저가 꺼지거나 네트워크가 단절되면 긴급 착륙 트리거가 작동하지 않아 기체가 공중에 방치됨.
- **착륙 완료 처리 누락 (Ghost 버그):** 시뮬레이터가 스스로 배터리 고갈로 하강하여 시뮬레이션을 종료해도, 스케줄러(백엔드)에 통보하지 않아 기체가 지도에서 조용히 사라질 뿐 착륙 완료 로그에 남지 않음.

---

## 2. 변경 전 (Before) 아키텍처 플로우

대시보드 의존적인 흐름(Frontend-driven) 구조를 나타냅니다.

```mermaid
sequenceDiagram
    participant Simulator as 시뮬레이터 (Simulator)
    participant Scheduler as 스케줄러 (Backend)
    participant Dashboard as 대시보드 (Frontend)

    Simulator->>Scheduler: uam/status (매초 상태 전송, MQTT)
    Scheduler->>Dashboard: uam:update (웹소켓 브로드캐스트)
    
    Note over Dashboard: 배터리 15% 미만 감지<br/>프론트엔드 자체 카운트다운 동작
    
    Dashboard->>Scheduler: landing:approve (카운트다운 만료 시 웹소켓 전송)
    
    Note over Scheduler: 착륙 리스트에 기체 등록<br/>클라이언트에 업데이트 전송
    
    Scheduler->>Simulator: 하강 명령 전송 (MQTT)
    
    Note over Simulator: 고도 하강 로직 돌입
    Simulator->>Simulator: 고도 0 도달 시 기체 시뮬레이션 조용히 종료 (문제점!)
```

---

## 3. 변경 후 (After) 아키텍처 플로우

관심사 분리(Separation of Concerns)를 통해 **대시보드는 수동 제어와 철저한 모니터링(Viewer)** 역할만 담당하고, **생존 기믹(Fail-safe)은 시뮬레이터가 자율적으로 판단**하며, **착륙 데이터의 정합성은 스케줄러가 중앙 통제**(Event-Driven)하도록 개편되었습니다.

```mermaid
sequenceDiagram
    participant Simulator as 시뮬레이터 (Simulator)
    participant Scheduler as 스케줄러 (Backend)
    participant Dashboard as 대시보드 (Frontend)

    Simulator->>Scheduler: uam/status (매초 상태 전송)
    Scheduler->>Dashboard: uam:update (화면 렌더링)

    alt 트랙 A: 정상 수동 착륙
        Dashboard->>Scheduler: landing:approve (관제사 버튼 클릭)
        Note over Scheduler: registerLanded 호출<br/>착륙 리스트 선제적 등록
        Scheduler->>Dashboard: landed:update (대시보드에 착륙 반영)
        Scheduler->>Simulator: 하강 명령 (MQTT 파견)
        Note over Simulator: LDP에서 대기하다가 하강 시작
    else 트랙 B: 긴급 자동 착륙 (Fail-Safe 작동)
        Note over Simulator: 매초 배터리 검사 중 15% 미만 감지!
        Note over Simulator: 대시보드 명령 없이 즉각 하강 플래그 ON<br/>(landingApproved = true)
    end

    Note over Simulator: 고도 하강 중...
    Note over Simulator: 고도 0 도달 시<br/>물리적 착륙 및 시뮬레이션 종료
    
    Simulator->>Scheduler: uam/landed (최종 착륙 완료 통보, MQTT)
    
    Note over Scheduler: registerLanded 호출<br/>(트랙 B의 경우 여기서 리스트에 최초 등록됨)
    Scheduler->>Dashboard: landed:update (착륙 완료 로그에 표시!)
```

## 4. 리팩토링 주요 효과 (Benefit)

1. **단일 진실 공급원 (Single Source of Truth) 기반 안전 보장**:
   프론트엔드 연결 유무와 상관없이 기체(시뮬레이터) 내부 배터리가 15%가 되는 순간 **무조건 강제 하강**을 시작하여 항공 규정상 안전 마지노선을 지킵니다. 대시보드의 임계값은 20%로 상향하여 관리자가 상황을 미리 인지하고 **선제적 수동 대응**을 할 수 있도록 유도합니다.
2. **이벤트 기반 완료 선언 (Event-Driven Completion)**:
   어떤 방식으로 기체가 내려왔든 간에(수동 vs 자동 강제), 시뮬레이터가 땅에 착지하는 시점에 `uam/landed` 이벤트를 스케줄러로 발송함으로써 착륙 완료 큐 정리가 100% 보장됩니다.
3. **프론트엔드 복잡도 및 버그 최소화**:
   리액트(App.tsx) 내부의 수많은 렌더 루프 및 `setTimeout` 타임아웃, 예외 처리(ClearTimeout), 동시성 문제(중복 승인) 요소가 완벽하게 사라졌습니다.

---

## 5. 파이프라인 E2E 스트레스 벤치마크 & 무결성 검증 결과

아키텍처 리팩토링 후, 대규모 고밀도 트래픽(1,000대 가상 UAM 기체) 환경에서 파이프라인의 처리 한계와 데이터 무결성을 1:1 `packetId` 추적 기법으로 실측 검증했습니다.

* **테스트 조건**: 총 1,000대 기체 | 1회당 10,000건 표본 | 10ms 고정 주기 (OS 타이머 지터 배제)
* **검증 경로**: Simulator (`MQTT QoS 1`) ➔ Mosquitto (`L2`) ➔ Scheduler Engine (`L3`) ➔ WebSocket Gateway (`L4`)

### 5단계 부하 벤치마크 매트릭스 (Throughput vs Latency)

| 단계 | 배치 / 주입 강도 | 유효 처리량 (Throughput) | 패킷 유실률 (Drop Rate) | P99 지연시간 | SLA 판정 (< 15ms) | 아키텍처 상태 분석 |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **1단계** | **Batch 30** (3,000 TPS) | **2,558 TPS** | **0.00% (0 pkt)** | **7 ms** | **PASS** | 정상 고밀도 순항 기준선 (Baseline) |
| **2단계** | **Batch 50** (5,000 TPS) | **3,917 TPS** | **0.00% (0 pkt)** | **8 ms** | **PASS** | 항공 관제 SLA 최적 수용 한계 (Sweet Spot) |
| **3단계** | **Batch 100** (10,000 TPS)| **7,396 TPS** | **0.00% (0 pkt)** | **12 ms** | **PASS** | **[목표 달성]** 10,000 TPS 급 실시간성 & 무손실 |
| **4단계** | **Batch 150** (15,000 TPS)| **9,506 TPS** | **0.00% (0 pkt)** | **46 ms** | **CHECK** | 포화점 진입 및 인메모리 버퍼 큐잉 완충 (평균 10ms) |
| **5단계** | **Batch 500** (50,000 TPS)| **13,280 TPS** | **0.00% (0 pkt)** | **271 ms** | **CHECK** | **[피크 한계 용량]** 0.75초 만에 전량 0.00% 무손실 복원 |

### 핵심 엔지니어링 성과
1. **0.00% 무손실(Zero-Loss) 검증**: 1~5단계 전 구간(총 50,000건 이상 주입)에서 `Lost Packets: 0 pkts` 달성.
2. **실시간 초저지연 보장 (~7,400 TPS)**: 일반 고밀도 운용 환경에서 `P99 7~12ms (평균 3~6ms)`로 항공 관제 초저지연 SLA 완벽 충족.
3. **극한 버스트 방어 (13,280 TPS / 0.75s)**: 0.2초 만에 1만 건이 폭주하는 극한 상황에서도 Mosquitto C언어 소켓 버퍼 및 논블로킹 비동기 릴레이를 통해 단 1건의 드랍 없이 전량 소화.

