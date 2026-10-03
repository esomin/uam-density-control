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
  const sentTimestamps = new Map<string, number>();

  await new Promise<void>((resolve, reject) => {
    wsClient.on('connect', () => {
      console.log('[L4 GATEWAY] Connected to Scheduler WebSocket Gateway');
      resolve();
    });
    wsClient.on('connect_error', (err) => {
      reject(new Error(`WebSocket connection failed: ${err.message}`));
    });
  });

  // 수신 리스너 (도착 시각 계산)
  wsClient.on('uam:benchmark:direct', (uam: any) => {
    const arriveTime = Date.now();
    if (uam && uam.uamId && sentTimestamps.has(uam.uamId)) {
      const sentTime = sentTimestamps.get(uam.uamId)!;
      const delta = arriveTime - sentTime;
      if (delta >= 0) {
        latencies.push(delta);
      }
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
    if (config.mode === 'STEADY' && latencies.length >= config.sampleCount) {
      clearInterval(interval);
      return;
    }

    const now = Date.now();
    for (let i = 0; i < batchSize; i++) {
      const uamId = `${config.mode === 'STRESS' ? 'STRESS' : 'STEADY'}-${(sentCount % config.fleetSize).toString().padStart(3, '0')}`;
      sentTimestamps.set(uamId, now);

      const payload = {
        uamId,
        latitude: 37.513 + (Math.random() - 0.5) * 0.05,
        longitude: 127.108 + (Math.random() - 0.5) * 0.05,
        altitude: 500,
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
      process.stdout.write(`... Sent: ${sentCount} / ${config.sampleCount} packets\r`);
    } else if (config.mode === 'STEADY') {
      process.stdout.write(`... Collected: ${latencies.length} / ${config.sampleCount} samples\r`);
    }
  }, config.intervalMs);

  // 3. 전송 완료 대기 후 결과 수집 및 통계 산출
  await new Promise<void>((resolve) => {
    const checkInterval = setInterval(() => {
      const isFinished = config.mode === 'STRESS' ? (sentCount >= config.sampleCount) : (latencies.length >= config.sampleCount);
      if (isFinished) {
        clearInterval(checkInterval);
        setTimeout(resolve, config.mode === 'STRESS' ? 2000 : 1000);
      }
    }, 150);
  });

  const durationSec = (Date.now() - startTime) / 1000;
  console.log(`\n\n[DONE] Injection Completed in ${durationSec.toFixed(2)}s`);
  console.log(`- Total Sent: ${sentCount}`);
  console.log(`- Total Collected Latencies: ${latencies.length}`);

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
    console.log('  [SUMMARY] BENCHMARK RESULT (P99 VERIFICATION)');
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
      'Criteria (< 15ms)': p99 <= 15 ? 'PASS' : 'CHECK',
    });
  }

  mqttClient.end();
  wsClient.disconnect();
  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error('[ERROR] Benchmark Failed:', err);
  process.exit(1);
});
