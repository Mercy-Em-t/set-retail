require('dotenv').config();
const { Worker, Queue } = require('bullmq');
const IORedis = require('ioredis');

// Redis Connection (Standard Localhost for Dev)
const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

let DiscreteEngineFacade;
let SecureDatabaseAdapter;

async function loadEngineModules() {
  const adapterModule = await import('../src/lib/discrete_engine/DatabaseAdapter.js');
  const facadeModule = await import('../src/lib/discrete_engine/FacadeAPI.js');
  
  SecureDatabaseAdapter = adapterModule.SecureDatabaseAdapter;
  DiscreteEngineFacade = facadeModule.DiscreteEngineFacade;
}

// Ensure modules load before starting worker
loadEngineModules().then(() => {
  console.log('[+] Engine Modules Loaded into Worker Mesh.');

  /**
   * The Master Worker Mesh
   * Listens to the 'EngineQueue' for async payloads and cron events.
   */
  const worker = new Worker('EngineQueue', async (job) => {
    console.log(`[WORKER] Executing Job [${job.name}] with ID: ${job.id}`);
    
    // Abstract the backend logic to trigger Python Data Science Engine
    const triggerPythonEngine = async (t1_start, t1_end, t2_start, t2_end) => {
      try {
        const url = `http://127.0.0.1:8000/api/v1/analytics/audit?t1_start=${encodeURIComponent(t1_start)}&t1_end=${encodeURIComponent(t1_end)}&t2_start=${encodeURIComponent(t2_start)}&t2_end=${encodeURIComponent(t2_end)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Python API responded with ${response.status}`);
        
        const data = await response.json();
        console.log(`[WORKER] Successfully received Temporal Intelligence from Python.`);
        
        if (data.intelligence_payload && data.intelligence_payload.directives.length > 0) {
          console.warn(`[!] STRATEGIC DIRECTIVES ISSUED:`);
          data.intelligence_payload.directives.forEach(d => console.warn(`  - ${d}`));
        } else {
          console.log(`[WORKER] Matrix stable. No critical directives issued.`);
        }
      } catch (err) {
        console.error(`[WORKER] Failed to trigger Python Engine:`, err.message);
      }
    };

    switch (job.name) {
      case 'ImmediateIngestionAudit':
        // Triggered by the API Gateway instantly when new telemetry arrives
        // We compare the last 7 days against the previous 7 days
        await triggerPythonEngine(
          "2023-01-01 00:00:00", "2023-01-07 23:59:59", // Mock historical baseline
          "2024-01-01 00:00:00", "2024-01-07 23:59:59"  // Mock current timeframe
        );
        break;

      case 'DailyFirewall':
        // The 11:59 PM cron job.
        console.log("Running Daily Firewall Sweep...");
        await triggerPythonEngine(
          "2023-01-01 00:00:00", "2023-01-31 23:59:59", 
          "2024-01-01 00:00:00", "2024-01-31 23:59:59"
        );
        break;

      case 'MonthlyStrategyTrigger':
        // The Monthly 1st-day strategy generator
        console.log("Running Monthly Strategy Meta-Analysis...");
        await triggerPythonEngine(
          "2023-01-01 00:00:00", "2023-01-31 23:59:59", 
          "2024-01-01 00:00:00", "2024-01-31 23:59:59"
        );
        break;

      default:
        console.warn(`[WORKER] Unknown job type: ${job.name}`);
    }
  }, { connection });

  worker.on('completed', job => {
    console.log(`[WORKER] Job ${job.id} has completed successfully and serialized its state.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[WORKER] Job ${job.id} failed with error:`, err);
  });

  console.log('[+] Autonomous Worker Mesh is online and listening for heartbeat triggers.');

}).catch(err => {
  console.error("Worker failed to start up:", err);
});
