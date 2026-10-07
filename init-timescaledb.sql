-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 1. UAM High-Frequency Telemetry Hypertable
CREATE TABLE IF NOT EXISTS uam_telemetry (
    recorded_at TIMESTAMPTZ NOT NULL,
    uam_id VARCHAR(64) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION NOT NULL,
    battery_percent DOUBLE PRECISION NOT NULL,
    distance_to_target_km DOUBLE PRECISION NOT NULL,
    speed_kmh DOUBLE PRECISION NOT NULL,
    eta_seconds DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION NOT NULL,
    destination_key VARCHAR(64) NOT NULL,
    waiting_for_landing BOOLEAN DEFAULT FALSE,
    priority_score DOUBLE PRECISION NOT NULL,
    packet_id VARCHAR(64)
);

-- Convert to Hypertable partitioned by 1 day chunks
SELECT create_hypertable('uam_telemetry', 'recorded_at', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Composite Index for fast time-series + uamId queries
CREATE INDEX IF NOT EXISTS idx_uam_telemetry_time_uamid ON uam_telemetry (recorded_at DESC, uam_id);
CREATE INDEX IF NOT EXISTS idx_uam_telemetry_dest ON uam_telemetry (destination_key, recorded_at DESC);

-- 2. UAM Landed Audit Events Table
CREATE TABLE IF NOT EXISTS uam_landing_events (
    id SERIAL PRIMARY KEY,
    landed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uam_id VARCHAR(64) NOT NULL,
    destination_key VARCHAR(64),
    final_battery_percent DOUBLE PRECISION,
    total_flight_time_sec DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uam_landing_events_uamid ON uam_landing_events (uam_id, landed_at DESC);
