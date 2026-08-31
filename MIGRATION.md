# UAM Density Control — 비용 최적화 및 운영 마이그레이션 가이드 (Spot ➔ Production)

본 문서는 개발 및 테스트 단계에서 **스팟 VM(Spot VM)**을 활용하여 비용을 최대 70~80% 절감하고, 시스템 검증 완료 후 설정 및 데이터를 100% 보존한 상태로 **운영용 표준(Standard) VM으로 안전하게 전환(Migration)**하는 절차를 설명합니다.

---

## 1. 비용 최적화 전략 및 스펙 가이드

동일한 사양이라도 **리전(Region)**과 **인스턴스 유형(Spot vs Standard)**에 따라 비용 차이가 크게 발생합니다.

### 머신 사양 및 리전 선정
* **추천 리전**: **대만 (`asia-east1-a`)**
  * 서울 대비 단가 약 15~20% 저렴
  * 한국 접속 지연 시간(Ping) 30~40ms 수준으로 실시간 WebSocket/MQTT 관제에 최적
* **머신 유형**: **`e2-standard-2`** (2 vCPU, 8GB RAM)
  * 현재 프로젝트를 포함하여 총 4개 프로젝트(컨테이너 12~16개)를 동시에 안정적으로 구동 가능
* **부팅 디스크**: **30GB Balanced Persistent Disk (`pd-balanced`)**

### 비용 비교 (e2-standard-2 기준)
| 구분 | 서울 리전 (`asia-northeast3`) | 대만 리전 (`asia-east1`) | 절감 효과 |
| :--- | :--- | :--- | :--- |
| **표준 온디맨드 (운영용)** | 약 $55 ~ $60 / 월 | **약 $48 / 월** | 기본 약 15~20% 절감 |
| **스팟 VM (개발/테스트용)** | 약 $18 / 월 | **약 $14 / 월** | **약 75% 대폭 절감 (월 1만 원대)** |

---

## 2. Phase 1: 개발/테스트용 스팟 VM 인프라 구축

초기 구축 및 테스트 단계에서는 스팟 VM으로 인스턴스를 생성하여 비용을 최소화합니다.

```bash
# 1. 개발/테스트용 스팟 VM 인스턴스 생성 (대만 리전)
gcloud compute instances create uam-control-server \
  --project="composite-watch-479007-q5" \
  --zone=asia-east1-a \
  --machine-type=e2-standard-2 \
  --provisioning-model=SPOT \
  --instance-termination-action=STOP \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-balanced \
  --tags=uam-server,http-server,https-server

# 2. 방화벽 규칙 생성 (MQTT + 웹 포트 개방)
gcloud compute firewall-rules create allow-uam-mqtt \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:1883,tcp:8083,tcp:9001 \
  --target-tags=uam-server \
  --description="Allow MQTT Telemetry Ingress"

gcloud compute firewall-rules create allow-uam-web \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:80,tcp:443 \
  --target-tags=uam-server \
  --description="Allow Web Dashboard and WebSocket"

# 3. 고정 외부 IP 예약 및 VM 연결
gcloud compute addresses create uam-static-ip \
  --region=asia-east1

gcloud compute instances add-access-config uam-control-server \
  --zone=asia-east1-a \
  --address=$(gcloud compute addresses describe uam-static-ip --region=asia-east1 --format="value(address)")

# 4. SSH 접속
gcloud compute ssh uam-control-server --zone=asia-east1-a
```

> **검증 완료 후:** SSH 접속 후 Docker 환경 구성 및 소스코드 클론, 4개 프로젝트 배포 및 동작 테스트를 모두 완료합니다.

---

## 3. Phase 2: 운영용 무중단 마이그레이션 절차

모든 프로젝트의 정상 동작이 확인되면, **설정 파일·소스코드·도커 환경을 100% 보존한 상태**로 표준 온디맨드 VM으로 즉시 전환합니다.

> **전환 원리:**  
> 기존 Spot VM을 삭제할 때 **부팅 디스크를 보존(`--keep-disks=boot`)**하고, 보존된 디스크를 그대로 물려 **표준 VM을 1분 만에 재생성**합니다.

```
[ Step 1. Spot VM 중지 ]
           ▼
[ Step 2. VM 삭제 (부팅 디스크는 100% 보존: --keep-disks=boot) ]
           ▼
[ Step 3. 보존된 디스크로 표준(Standard) VM 생성 (재설치/빌드 불필요) ]
           ▼
[ Step 4. 기존 고정 IP(Static IP) 재연결 (도메인/URL 변경 없음) ]
```

### 단계별 마이그레이션 명령어 (로컬 터미널에서 실행)

#### Step 1. 기존 Spot VM 중지
작업 데이터 및 파일시스템 무결성을 위해 VM을 중지합니다.
```bash
gcloud compute instances stop uam-control-server --zone=asia-east1-a
```

#### Step 2. 부팅 디스크를 보존하며 인스턴스 껍데기만 삭제
```bash
gcloud compute instances delete uam-control-server \
  --zone=asia-east1-a \
  --keep-disks=boot
```
*(삭제 확인 질문 시 `Y` 입력)*

#### Step 3. 보존된 디스크로 운영용 표준(Standard) VM 생성
OS나 패키지를 재설치하지 않고, 기존 디스크(`uam-control-server`)를 부팅 디스크로 지정하여 즉시 구동합니다.
```bash
gcloud compute instances create uam-control-server \
  --project="composite-watch-479007-q5" \
  --zone=asia-east1-a \
  --machine-type=e2-standard-2 \
  --disk=name=uam-control-server,boot=yes,auto-delete=yes \
  --tags=uam-server,http-server,https-server
```

#### Step 4. 기존 고정 IP(Static IP) 재연결
포트폴리오 주소나 외부 접근 IP가 바뀌지 않도록 기존 고정 IP를 다시 연결합니다.
```bash
gcloud compute instances add-access-config uam-control-server \
  --zone=asia-east1-a \
  --address=$(gcloud compute addresses describe uam-static-ip --region=asia-east1 --format="value(address)")
```

---

## 4. 운영 안정성 점검 체크리스트

1. **자동 재시작 설정 (`restart: always`)**
   각 프로젝트의 `compose.yml`(또는 `docker-compose.yml`) 서비스 설정에 `restart: always`가 적용되어 있는지 확인합니다. VM이 재부팅되더라도 모든 컨테이너가 자동으로 기동됩니다.
2. **방화벽 및 포트 재확인**
   동일한 태그(`uam-server`)로 생성되었으므로 기존 방화벽 규칙이 자동으로 적용됩니다.
3. **리소스 모니터링**
   ```bash
   # VM 접속
   gcloud compute ssh uam-control-server --zone=asia-east1-a

   # 컨테이너 상태 및 리소스 확인
   docker ps
   docker stats
   ```
