require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const csv = require('csv-parser');

const upload = multer({ dest: 'uploads/' });

// Redis Connection
const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

// Initialize the master engine queue
const engineQueue = new Queue('EngineQueue', { connection });

// Note: In a true production environment, these would be compiled into the backend 
// bundle, but since we are running locally in the same repo, we can dynamically import
// the ES module logic from the discrete_engine folder.
let SecureDatabaseAdapter;
let DiscreteEngineFacade;

// Async initialization of ES modules inside CommonJS
async function loadEngineModules() {
  const adapterModule = await import('../src/lib/discrete_engine/DatabaseAdapter.js');
  const facadeModule = await import('../src/lib/discrete_engine/FacadeAPI.js');
  
  SecureDatabaseAdapter = adapterModule.SecureDatabaseAdapter;
  DiscreteEngineFacade = facadeModule.DiscreteEngineFacade;
}

const app = express();
app.use(express.json());
app.use(cors());

// Basic API Key Middleware for Gateway Security
const requireApiKey = (req, res, next) => {
  const apiKey = req.header('x-api-key');
  if (!apiKey || apiKey !== process.env.GATEWAY_API_KEY) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
  }
  next();
};

/**
 * HIGH-THROUGHPUT TELEMETRY INGESTION ENDPOINT
 * Route: POST /api/v1/telemetry/orders
 * Purpose: Receive real-time transactional payloads from POS systems.
 */
app.post('/api/v1/telemetry/orders', requireApiKey, async (req, res) => {
  try {
    const { shopId, telemetryPayload } = req.body;
    
    if (!shopId || !telemetryPayload) {
      return res.status(400).json({ error: "Malformed payload: Missing shopId or telemetryPayload" });
    }

    // 1. Isolate Database Interactions using the ORM Layer
    const dbAdapter = new SecureDatabaseAdapter(shopId);
    
    // 2. Ingest the payload directly into the 'orders' and 'order_items' tables
    const savedOrder = await dbAdapter.ingestTelemetryPayload(telemetryPayload);

    // 3. Offload the Mathematical Engine execution into the asynchronous Redis queue
    // This allows the API Gateway to return instantly without waiting for O(n log n) computations
    await engineQueue.add('ImmediateIngestionAudit', {
      shopId: shopId,
      triggerTime: new Date().toISOString()
    });

    res.status(201).json({ 
      success: true, 
      message: "Telemetry ingested securely. Meta-analysis dispatched to worker mesh.", 
      orderId: savedOrder.id 
    });

  } catch (error) {
    console.error("Ingestion Pipeline Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * TEMPORAL AUDIT PROXY ENDPOINT
 * Route: GET /api/temporal-audit
 * Purpose: Connect the React Dashboard natively to the Python Data Science Engine.
 */
app.get('/api/temporal-audit', async (req, res) => {
  try {
    const { t1_start, t1_end, t2_start, t2_end } = req.query;
    
    // Default to the seeded DB dates if not provided
    const q_t1_start = t1_start || "2023-01-01 00:00:00";
    const q_t1_end = t1_end || "2023-01-31 23:59:59";
    const q_t2_start = t2_start || "2024-01-01 00:00:00";
    const q_t2_end = t2_end || "2024-01-31 23:59:59";

    const url = `http://127.0.0.1:8000/api/v1/analytics/audit?t1_start=${encodeURIComponent(q_t1_start)}&t1_end=${encodeURIComponent(q_t1_end)}&t2_start=${encodeURIComponent(q_t2_start)}&t2_end=${encodeURIComponent(q_t2_end)}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Python API Responded with ${response.status}`);
    
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Temporal Audit Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============== AUTHENTICATION =================
const USERS_FILE = path.join(__dirname, 'users.json');

// Initialize users.json if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

app.post('/api/v1/auth/signup', (req, res) => {
  const { email, password, companyName } = req.body;
  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "User already exists" });
  }

  const newUser = { id: Date.now().toString(), email, password, companyName, shopId: `SHOP-${Date.now()}` };
  users.push(newUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  
  res.status(201).json({ success: true, user: newUser });
});

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  res.status(200).json({ success: true, user });
});

// =============== CSV INGESTION =================
app.post('/api/v1/onboarding/upload-csv', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  
  const shopId = req.body.shopId || "DEFAULT-SHOP";
  const results = [];
  
  // Parse the CSV
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        // Transform CSV rows into the Telemetry Payload
        const items = results.map(row => ({
          sku: row.SKU || row.sku || `UNKNOWN-${Math.random()}`,
          name: row.ProductName || row.name || "Unknown Product",
          price: parseFloat(row.Price || row.price || 0),
          quantity: parseInt(row.Quantity || row.quantity || 1)
        }));

        const telemetryPayload = {
          order_id: `CSV-${Date.now()}`,
          customer_id: "BULK-IMPORT",
          customer_tier: "STANDARD",
          timestamp: new Date().toISOString(),
          items: items
        };

        const dbAdapter = new SecureDatabaseAdapter(shopId);
        await dbAdapter.ingestTelemetryPayload(telemetryPayload);
        
        // Trigger Engine
        await engineQueue.add('ImmediateIngestionAudit', {
          shopId: shopId,
          triggerTime: new Date().toISOString()
        });

        // Cleanup temp file
        fs.unlinkSync(req.file.path);

        res.status(200).json({ success: true, message: `Processed ${items.length} items from CSV.` });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
});

// Setup Cron Jobs
async function configureCronJobs() {
  const shopId = process.env.TARGET_SHOP_ID || "00000000-0000-0000-0000-000000000000"; // Mock shop for demo

  // Daily Firewall: Runs at 23:59 every night
  await engineQueue.add('DailyFirewall', { shopId }, {
    repeat: { pattern: '59 23 * * *' }
  });

  // Monthly Strategy Trigger: Runs at 00:00 on the 1st of every month
  await engineQueue.add('MonthlyStrategyTrigger', { shopId }, {
    repeat: { pattern: '0 0 1 * *' }
  });

  console.log('[+] Autopilot Cron Jobs Scheduled via BullMQ');
}

// Start Server
const PORT = process.env.PORT || 3000;
loadEngineModules().then(async () => {
  await configureCronJobs();
  
  app.listen(PORT, () => {
    console.log(`[+] High-Performance API Gateway listening on port ${PORT}`);
  });
}).catch(err => {
  console.error("Failed to load engine modules:", err);
});
