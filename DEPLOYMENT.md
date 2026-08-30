# UAM Density Control — GCE + Docker Compose 배포 가이드

본 문서는 **Google Compute Engine (GCE)** 단일 가상머신(VM) 환경에서 **Docker Compose**를 사용하여 UAM Density Control 시스템(MQTT 브로커, Redis, 스케줄러, 시뮬레이터, 관제 대시보드)을 배포하고 운영하기 위한 상세 가이드입니다.

---

## 1. 배포 아키텍처 및 시스템 구성

GCE 인스턴스 내부에서 Docker 가상 네트워크(`uam-net`)를 통해 5개 서비스를 컨테이너로 격리하여 실행합니다.

```
[ 가상 UAM 기체 / IoT ] ─────────(TCP: 1883)───────────┐
                                                       ▼
[ 관제 브라우저 (Dashboard) ] ───(HTTP: 80 / HTTPS: 443)──► [ GCE VM (Ubuntu 22.04) ]
                                                              │
                    ┌─────────────────────────────────────────┴─────────────────────────────────────────┐
                    │  [Docker Compose: uam-net]                                                        │
                    │                                                                                   │
                    │   ├── 1. uam-mqtt-broker (Mosquitto)      : 1883 (외부 개방), 9001 (내부)          │
                    │   ├── 2. uam-redis (Redis 7)              : 6379 (내부 격리)                       │
                    │   ├── 3. uam-scheduler (NestJS)           : 3002 (내부 격리, WebSocket 엔진)       │
                    │   ├── 4. uam-simulator (NestJS)           : 3001 (내부 격리, 가상 UAM 텔레메트리)   │
                    │   └── 5. uam-dashboard (Nginx)            : 80 / 443 (외부 개방, 정적 서빙 & WSS)   │
                    └───────────────────────────────────────────────────────────────────────────────────┘
```

### 서비스별 역할 및 포트 정보

| 서비스 명 | 컨테이너 명 | 기본 포트 | 외부 개방 여부 | 설명 |
| :--- | :--- | :--- | :---: | :--- |
| **MQTT Broker** | `uam-mqtt-broker` | `1883` (TCP) | **개방** | UAM 기체 텔레메트리 수집 브로커 |
| **In-Memory DB** | `uam-redis` | `6379` (TCP) | **내부 격리** | 착륙 우선순위 큐(ZSET) 및 백프레셔 버퍼 |
| **Scheduler Engine** | `uam-scheduler` | `3002` (HTTP/WS) | **내부 격리** | 우선순위 산정, 스케줄링 및 Socket.io 허브 |
| **Simulator** | `uam-simulator` | `3001` (HTTP) | **내부 격리** | 가상 UAM 기체 20대 실시간 비행 시뮬레이션 |
| **Dashboard Web** | `uam-dashboard` | `80` (HTTP) | **개방** | Nginx 관제 웹 대시보드 및 WebSocket 프록시 |

---

## 2. 권장 GCE 인스턴스 사양

* **머신 유형**: **`e2-standard-2`** (2 vCPU, 8GB RAM)  
  *(초기 신규 가입 시 제공되는 **$300 무료 크레딧**으로 90일간 전액 무료 운영 가능)*
* **운영체제(OS)**: Ubuntu 22.04 LTS x86/64
* **부팅 디스크**: 50GB Balanced Persistent Disk (`pd-balanced`)
* **리전/영역**: `asia-northeast3` (서울 리전) / `asia-northeast3-a`

---

## 3. 단계별 GCP 인프라 구축 및 배포 절차

### Step 1. GCE 가상머신(VM) 인스턴스 생성

로컬 터미널의 `gcloud CLI` 또는 Google Cloud Console을 통해 VM을 생성합니다.

```bash
gcloud compute instances create uam-control-server \
  --project="<YOUR_GCP_PROJECT_ID>" \
  --zone=asia-northeast3-a \
  --machine-type=e2-standard-2 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-balanced \
  --tags=uam-server,http-server,https-server
```

---

### Step 2. VPC 방화벽 규칙 생성 (포트 개방)

MQTT 기체 통신(1883) 및 웹 관제 대시보드(80, 443) 접근을 허용합니다.  
*(⚠️ Redis `6379` 포트는 보안을 위해 외부에 절대 개방하지 않습니다.)*

```bash
# 1. UAM 기체 MQTT 텔레메트리 수집 포트(1883) 개방
gcloud compute firewall-rules create allow-uam-mqtt \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:1883 \
  --target-tags=uam-server \
  --description="Allow MQTT Telemetry Ingress"

# 2. 관제 대시보드 웹 및 WebSocket 포트(80, 443) 개방
gcloud compute firewall-rules create allow-uam-web \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:80,tcp:443 \
  --target-tags=uam-server \
  --description="Allow Web Dashboard and WebSocket"
```

---

### Step 3. 고정 외부 IP (Static IP) 예약 및 연결

서버 재부팅 시에도 IP가 변경되지 않도록 고정 IP를 발급하여 VM에 연결합니다.

```bash
# 1. 서울 리전에 고정 IP 예약
gcloud compute addresses create uam-static-ip \
  --region=asia-northeast3

# 2. 인스턴스에 고정 IP 할당
gcloud compute instances add-access-config uam-control-server \
  --zone=asia-northeast3-a \
  --address=$(gcloud compute addresses describe uam-static-ip --region=asia-northeast3 --format="value(address)")

# 3. 할당된 외부 IP 확인
gcloud compute addresses describe uam-static-ip --region=asia-northeast3 --format="value(address)"
```

---

### Step 4. VM 접속 및 Docker 환경 구축

생성된 VM에 SSH로 접속한 뒤 Docker 및 Docker Compose 플러그인을 설치합니다.

```bash
# 1. GCE VM 접속
gcloud compute ssh uam-control-server --zone=asia-northeast3-a

# 2. 필수 패키지 및 Docker Engine / Docker Compose V2 설치
sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg git

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 3. docker 명령어 sudo 없이 실행 가능하도록 권한 설정
sudo usermod -aG docker $USER
newgrp docker
```

---

### Step 5. 소스코드 클론 및 Docker Compose 배포

```bash
# 1. 저장소 클론
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd uam-density-control

# 2. 프로덕션 Docker Compose 실행 (빌드 및 백그라운드 구동)
docker compose -f docker-compose.prod.yml up -d --build
```

---

### Step 6. 서비스 정상 구동 검증

```bash
# 1. 컨테이너 구동 상태 확인 (5개 서비스 모두 Up 상태 확인)
docker compose -f docker-compose.prod.yml ps

# 출력 예시:
# NAME               IMAGE                              COMMAND                  SERVICE      STATUS
# uam-dashboard      uam-density-control-dashboard      "/docker-entrypoint.…"   dashboard    Up (healthy)
# uam-mqtt-broker    eclipse-mosquitto:2.0              "/docker-entrypoint.…"   mosquitto    Up
# uam-redis          redis:7-alpine                     "docker-entrypoint.s…"   redis        Up
# uam-scheduler      uam-density-control-scheduler      "docker-entrypoint.s…"   scheduler    Up
# uam-simulator      uam-density-control-simulator      "docker-entrypoint.s…"   simulator    Up

# 2. 실시간 로그 스트리밍 확인
docker compose -f docker-compose.prod.yml logs -f scheduler simulator
```

#### 브라우저 접속 테스트:
* 브라우저 주소창에 **`http://<Step 3에서 확인한_고정_외부_IP>`** 입력
* 실시간 3D 지도에 20대의 UAM 기체가 비행하고 착륙 우선순위 큐가 갱신되는지 확인합니다.

---

## 4. 운영 및 유지보수 명령어

### 최신 코드 반영 (무중단 롤링 업데이트)
```bash
cd uam-density-control
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### 컨테이너 관리 명령어
```bash
# 전체 서비스 중지
docker compose -f docker-compose.prod.yml stop

# 전체 서비스 시작
docker compose -f docker-compose.prod.yml start

# 전체 서비스 재시작
docker compose -f docker-compose.prod.yml restart

# 전체 컨테이너 및 네트워크 제거 (볼륨 데이터 유지)
docker compose -f docker-compose.prod.yml down

# 실시간 리소스(CPU/RAM) 사용량 모니터링
docker stats
```

---

## 5. (선택) HTTPS (SSL) 인증서 적용 가이드

운영 도메인이 있는 경우 Certbot을 통해 Let's Encrypt 무료 SSL 인증서를 발급하여 HTTPS(443)를 적용할 수 있습니다.

1. **Certbot 설치**:
   ```bash
   sudo apt-get install -y certbot
   ```
2. **인증서 발급 (독립 실행 모드)**:
   ```bash
   # Nginx 컨테이너 임시 중지 후 80 포트로 인증서 발급
   docker compose -f docker-compose.prod.yml stop dashboard
   sudo certbot certonly --standalone -d your-domain.com
   ```
3. **Nginx 설정에 SSL 경로 추가 후 컨테이너 재기동**:
   `/etc/letsencrypt/live/your-domain.com/` 디렉터리의 `fullchain.pem` 및 `privkey.pem`을 볼륨 마운트하여 적용합니다.
