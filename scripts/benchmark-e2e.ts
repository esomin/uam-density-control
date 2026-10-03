import { io, Socket } from 'socket.io-client';
import * as mqtt from 'mqtt';

// CLI 인자 파싱 (--mode=stress 또는 --mode=steady)
const args = process.argv.slice(2);
const isStressMode = args.includes('--mode=stress') || args.includes('stress');

interface BenchmarkConfig {
  mode: 'STEADY' | 'STRESS';
  sampleCount: number;
  mqttUrl: string;
  wsUrl: string;
  topic: string;
  fleetSize: number;
  intervalMs: number;
}

const config: BenchmarkConfig = isStressMode
  ? {
      mode: 'STRESS',
      sampleCount: 10000,
      mqttUrl: 'mqtt://localhost:1883',
      wsUrl: 'http://localhost:3002',
      topic: 'uam/status/jamsil',
      fleetSize: 1000, // 1000대 고밀도 기체 시뮬레이션
      intervalMs: 10,  // 10ms 단위 고속 주입 (10,000 TPS)
    }
  : {
      mode: 'STEADY',
      sampleCount: 200,
      mqttUrl: 'mqtt://localhost:1883',
      wsUrl: 'http://localhost:3002',
      topic: 'uam/status/jamsil',
      fleetSize: 20,   // 정상 순항 기체 20대
      intervalMs: 1000,// 1초(1Hz) 정상 리듬
    };

async function runBenchmark() {
  console.log('====================================================');
  console.log(`  [BENCHMARK] UAM Pipeline Test (Mode: ${config.mode})`);
  console.log('====================================================');
  console.log(`[Config] Target: ${config.sampleCount} Samples | Fleet: ${config.fleetSize} UAMs | Interval: ${config.intervalMs}ms`);

  // 1. WebSocket 클라이언트 (도착 지점 L4)
  const wsClient: Socket = io(config.wsUrl, { transports: ['websocket'] });
  const latencies: number[] = [];
  
  // 고유 packetId 기반 1:1 수신 매핑 (전송 시각 저장)
  const sentPackets = new Map<string, number>();
  let receivedCount = 0;

  await new Promise<void>((resolve, reject) => {
    wsClient.on('connect', () => {
      console.log('[L4 GATEWAY] Connected to Scheduler WebSocket Gateway');
      resolve();
    });
    wsClient.on('connect_error', (err) => {
      reject(new Error(`WebSocket connection failed: ${err.message}`));
    });
  });

  // 수신 리스너 (packetId 기반 1:1 수신 검증 및 레이턴시 산출)
  wsClient.on('uam:benchmark:direct', (uam: any) => {
    const arriveTime = Date.now();
    const packetKey = uam?.packetId || (uam?.timestamp ? `${uam.uamId}_${uam.timestamp}` : uam?.uamId);

    if (packetKey && sentPackets.has(packetKey)) {
      const sentTime = sentPackets.get(packetKey)!;
      const delta = arriveTime - sentTime;
      if (delta >= 0) {
        latencies.push(delta);
      }
      receivedCount++;
      sentPackets.delete(packetKey); // 1:1 수신 완료 처리
    }
  });

  // 2. MQTT 클라이언트 (출발 지점 L1)
  const mqttClient = mqtt.connect(config.mqttUrl);

  await new Promise<void>((resolve, reject) => {
    mqttClient.on('connect', () => {
      console.log('[L1/L2 BUS] Connected to Mosquitto MQTT Broker');
      resolve();
    });
    mqttClient.on('error', (err) => {
      reject(new Error(`MQTT connection failed: ${err.message}`));
    });
  });

  console.log(`\n[START] Emitting telemetries (${config.mode} mode)...`);
  const startTime = Date.now();

  let sentCount = 0;
  const batchSize = config.mode === 'STRESS' ? 10 : config.fleetSize;

  const interval = setInterval(() => {
    if (config.mode === 'STRESS' && sentCount >= config.sampleCount) {
      clearInterval(interval);
      return;
    }
    if (config.mode === 'STEADY' && receivedCount >= config.sampleCount) {
      clearInterval(interval);
      return;
    }

    const now = Date.now();
    for (let i = 0; i < batchSize; i++) {
      if (config.mode === 'STRESS' && sentCount >= config.sampleCount) break;

      const seq = sentCount + 1;
      const uamId = `${config.mode === 'STRESS' ? 'STRESS' : 'STEADY'}-${(sentCount % config.fleetSize).toString().padStart(3, '0')}`;
      const packetId = `${uamId}#pkt${seq}_${now}`;

      sentPackets.set(packetId, now);

      const payload = {
        packetId,
        uamId,
        latitude: 37.513 + (Math.random() - 0.5) * 0.05,
        longitude: 127.108 + (Math.random() - 0.5) * 0.05,
        altitude: 500,
        heading: 90,
        targetLat: 37.513,
        targetLng: 127.108,
        batteryPercent: 85 - ((i % 20) * 1.5),
        timestamp: now,
        destinationKey: 'jamsil',
        speedKmh: 150,
        distanceToTargetKm: 3.5 + (i % 20) * 0.5,
        etaSeconds: 90,
        waitingForLanding: false,
      };

      mqttClient.publish(config.topic, JSON.stringify(payload), { qos: 1 });
      sentCount++;
    }

    if (config.mode === 'STRESS' && sentCount % 1000 === 0) {
      process.stdout.write(`... Sent: ${sentCount} / ${config.sampleCount} | Received: ${receivedCount}\r`);
    } else if (config.mode === 'STEADY') {
      process.stdout.write(`... Collected: ${receivedCount} / ${config.sampleCount} samples\r`);
    }
  }, config.intervalMs);

  // 3. 전송 완료 후 전량 수신 대기 (Grace Period)
  await new Promise<void>((resolve) => {
    let lastReceived = -1;
    let idleCounter = 0;

    const checkInterval = setInterval(() => {
      const isSentAll = sentCount >= config.sampleCount;
      const isReceivedAll = receivedCount >= sentCount;

      if (isSentAll) {
        if (isReceivedAll) {
          clearInterval(checkInterval);
          setTimeout(resolve, 300);
          return;
        }

        // 전송 완료 후 추가 수신이 없으면 타임아웃 종료 (유실 측정)
        if (receivedCount === lastReceived) {
          idleCounter++;
          if (idleCounter >= 20) { // 약 3초 대기 (150ms * 20)
            clearInterval(checkInterval);
            resolve();
            return;
          }
        } else {
          lastReceived = receivedCount;
          idleCounter = 0;
        }
      }
    }, 150);
  });

  const durationSec = (Date.now() - startTime) / 1000;
  const lossCount = Math.max(0, sentCount - receivedCount);
  const dropRate = sentCount > 0 ? (lossCount / sentCount) * 100 : 0;
  const throughputTps = (receivedCount / durationSec).toFixed(0);

  console.log(`\n\n====================================================`);
  console.log(`  [DATA INTEGRITY & LOSS VERIFICATION]`);
  console.log('====================================================');
  console.table({
    'Total Sent (MQTT)': `${sentCount.toLocaleString()} pkts`,
    'Total Received (WS)': `${receivedCount.toLocaleString()} pkts`,
    'Lost Packets': `${lossCount} pkts`,
    'Drop Rate': `${dropRate.toFixed(2)} %`,
    'Integrity Status': lossCount === 0 ? '✅ ZERO LOSS (100% Delivered)' : '⚠️ LOSS DETECTED',
    'Effective Throughput': `${throughputTps} TPS`,
    'Elapsed Time': `${durationSec.toFixed(2)} s`,
  });

  if (latencies.length > 0) {
    latencies.sort((a, b) => a - b);
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    const avg = latencies.reduce((acc, v) => acc + v, 0) / latencies.length;
    const p50 = latencies[Math.floor(latencies.length * 0.50)];
    const p90 = latencies[Math.floor(latencies.length * 0.90)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    console.log('\n====================================================');
    console.log('  [LATENCY SUMMARY] (P99 VERIFICATION)');
    console.log('====================================================');
    console.table({
      'Sample Size': latencies.length,
      'Min Latency': `${min} ms`,
      'Avg Latency': `${avg.toFixed(2)} ms`,
      'P50 (Median)': `${p50} ms`,
      'P90': `${p90} ms`,
      'P95': `${p95} ms`,
      'P99 (Worst 1%)': `${p99} ms`,
      'Max Latency': `${max} ms`,
      'P99 SLA (< 15ms)': p99 <= 15 ? 'PASS' : 'CHECK',
    });
  }

  mqttClient.end();
  wsClient.disconnect();
  process.exit(lossCount === 0 ? 0 : 1);
}

runBenchmark().catch((err) => {
  console.error('[ERROR] Benchmark Failed:', err);
  process.exit(1);
});
