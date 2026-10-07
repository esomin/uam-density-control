import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import format from 'pg-format';
import { UamVehicleStatus } from '@uam/types';

export interface TelemetryRow {
  recordedAt: Date;
  uamId: string;
  latitude: number;
  longitude: number;
  altitude: number;
  batteryPercent: number;
  distanceToTargetKm: number;
  speedKmh: number;
  etaSeconds: number;
  heading: number;
  destinationKey: string;
  waitingForLanding: boolean;
  priorityScore: number;
  packetId?: string;
}

export interface LandingEventRow {
  landedAt: Date;
  uamId: string;
  destinationKey?: string;
  finalBatteryPercent?: number;
  totalFlightTimeSec?: number;
}

@Injectable()
export class PersistenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PersistenceService.name);
  private pool: Pool | null = null;

  // 인메모리 마이크로배치 버퍼
  private telemetryBuffer: TelemetryRow[] = [];
  private readonly BATCH_SIZE = 200; // 200건 도달 시 플러시
  private readonly FLUSH_INTERVAL_MS = 500; // 최대 500ms 지연 후 강제 플러시
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;

  onModuleInit() {
    const host = process.env.DB_HOST ?? 'localhost';
    const port = Number(process.env.DB_PORT ?? 5433);
    const user = process.env.DB_USER ?? 'uam_admin';
    const password = process.env.DB_PASSWORD ?? 'uam_password';
    const database = process.env.DB_NAME ?? 'uam_telemetry';

    this.pool = new Pool({
      host,
      port,
      user,
      password,
      database,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      this.logger.error(`[TimescaleDB Pool Error] ${err.message}`);
    });

    // 주기적 배치 플러시 타이머 가동
    this.flushTimer = setInterval(() => {
      this.flushTelemetryBatch().catch((err) => {
        this.logger.error(`[Auto-Flush Error] ${err.message}`);
      });
    }, this.FLUSH_INTERVAL_MS);

    this.logger.log(`[Persistence] Connected to TimescaleDB at ${host}:${port}/${database}`);
  }

  async onModuleDestroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // 종료 전 잔여 버퍼 플러시
    await this.flushTelemetryBatch();
    if (this.pool) {
      await this.pool.end();
    }
  }

  /**
   * 논블로킹 방식으로 텔레메트리 데이터를 마이크로배치 큐에 적재
   */
  pushTelemetry(data: UamVehicleStatus, priorityScore: number): void {
    const row: TelemetryRow = {
      recordedAt: new Date(data.timestamp || Date.now()),
      uamId: data.uamId,
      latitude: data.latitude,
      longitude: data.longitude,
      altitude: data.altitude,
      batteryPercent: data.batteryPercent,
      distanceToTargetKm: data.distanceToTargetKm ?? 0,
      speedKmh: data.speedKmh ?? 0,
      etaSeconds: data.etaSeconds ?? 0,
      heading: data.heading ?? 0,
      destinationKey: data.destinationKey ?? 'unknown',
      waitingForLanding: Boolean(data.waitingForLanding),
      priorityScore,
      packetId: data.packetId,
    };

    this.telemetryBuffer.push(row);

    if (this.telemetryBuffer.length >= this.BATCH_SIZE) {
      this.flushTelemetryBatch().catch((err) => {
        this.logger.error(`[Threshold Flush Error] ${err.message}`);
      });
    }
  }

  /**
   * 멀티 로우 배치 인서트로 TimescaleDB Hypertable에 대량 삽입 (디스크 I/O fsync 99% 절감)
   */
  async flushTelemetryBatch(): Promise<void> {
    if (this.isFlushing || this.telemetryBuffer.length === 0 || !this.pool) {
      return;
    }

    this.isFlushing = true;
    const batch = this.telemetryBuffer;
    this.telemetryBuffer = [];

    try {
      const values = batch.map((r) => [
        r.recordedAt,
        r.uamId,
        r.latitude,
        r.longitude,
        r.altitude,
        r.batteryPercent,
        r.distanceToTargetKm,
        r.speedKmh,
        r.etaSeconds,
        r.heading,
        r.destinationKey,
        r.waitingForLanding,
        r.priorityScore,
        r.packetId ?? null,
      ]);

      const query = format(
        `INSERT INTO uam_telemetry (
          recorded_at, uam_id, latitude, longitude, altitude,
          battery_percent, distance_to_target_km, speed_kmh, eta_seconds,
          heading, destination_key, waiting_for_landing, priority_score, packet_id
        ) VALUES %L`,
        values,
      );

      await this.pool.query(query);
      // this.logger.debug(`[TimescaleDB] Flushed ${batch.length} telemetry records.`);
    } catch (err: any) {
      this.logger.error(`[TimescaleDB Batch Insert Failed] ${err.message}`);
      // 필요 시 에러 발생 버퍼 재적재 또는 로깅
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * 착륙 완료 이벤트 감사 로그 비동기 영속화
   */
  async saveLandingEvent(event: LandingEventRow): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO uam_landing_events (
          landed_at, uam_id, destination_key, final_battery_percent, total_flight_time_sec
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          event.landedAt,
          event.uamId,
          event.destinationKey ?? null,
          event.finalBatteryPercent ?? null,
          event.totalFlightTimeSec ?? null,
        ],
      );
      this.logger.log(`[TimescaleDB] Saved landing audit event for ${event.uamId}`);
    } catch (err: any) {
      this.logger.error(`[Landing Event Save Failed] ${err.message}`);
    }
  }
}
