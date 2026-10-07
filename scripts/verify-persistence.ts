import { Pool } from 'pg';

async function main() {
  const host = process.env.DB_HOST ?? 'localhost';
  const port = Number(process.env.DB_PORT ?? 5433);
  const user = process.env.DB_USER ?? 'uam_admin';
  const password = process.env.DB_PASSWORD ?? 'uam_password';
  const database = process.env.DB_NAME ?? 'uam_telemetry';

  console.log(`Connecting to TimescaleDB at ${host}:${port}/${database}...`);

  const pool = new Pool({
    host,
    port,
    user,
    password,
    database,
  });

  try {
    const client = await pool.connect();
    console.log('Connected successfully!');

    // 1. Check hypertables
    const hypertableRes = await client.query(`
      SELECT hypertable_name, num_dimensions 
      FROM timescaledb_information.hypertables
      WHERE hypertable_name = 'uam_telemetry';
    `);
    console.log('\n[Hypertable Info]');
    console.table(hypertableRes.rows);

    // 2. Count telemetry rows
    const telemetryCount = await client.query('SELECT COUNT(*) FROM uam_telemetry;');
    console.log(`\n[Telemetry Count] Total Rows in uam_telemetry: ${telemetryCount.rows[0].count}`);

    // 3. Check landing events count
    const landingCount = await client.query('SELECT COUNT(*) FROM uam_landing_events;');
    console.log(`[Landing Events] Total Events in uam_landing_events: ${landingCount.rows[0].count}`);

    // 4. Sample latest telemetry
    const sampleRes = await client.query(`
      SELECT recorded_at, uam_id, battery_percent, priority_score, distance_to_target_km
      FROM uam_telemetry
      ORDER BY recorded_at DESC
      LIMIT 5;
    `);
    if (sampleRes.rows.length > 0) {
      console.log('\n[Latest 5 Telemetry Rows]');
      console.table(sampleRes.rows);
    }

    client.release();
  } catch (err: any) {
    console.error('[Error] Persistence verification failed:', err.message);
  } finally {
    await pool.end();
  }
}

main();
