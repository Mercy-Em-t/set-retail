require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const csv = require('csv-parser');

const upload = multer({ dest: require('os').tmpdir() });

// Supabase client (initialized at startup)
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || 'https://dmlrpjtjabanopetnnqt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbHJwanRqYWJhbm9wZXRubnF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA4MjA1NCwiZXhwIjoyMDk2NjU4MDU0fQ.2EWNGNbOznPdvJS-n3-sfpvb8fP5yxs1_V2GGPeDUds';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PYTHON_ENGINE_URL = 'https://set-retail-engine.onrender.com';

const app = express();
app.use(express.json());
app.use(cors());

// =============== MIDDLEWARE (defined BEFORE routes) =================

// Basic API Key Middleware for Gateway Security
const requireApiKey = (req, res, next) => {
  const apiKey = req.header('x-api-key');
  if (!apiKey || apiKey !== process.env.GATEWAY_API_KEY) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
  }
  next();
};

// JWT verification middleware using Supabase
const requireSupabaseAuth = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired JWT token" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ error: "Authentication service error" });
  }
};

// =============== ROUTES =================

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

    const ingestRes = await fetch(`${PYTHON_ENGINE_URL}/api/v1/telemetry/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telemetryPayload)
    });
    
    if (!ingestRes.ok) {
      throw new Error(`Python Engine Rejected Telemetry: ${ingestRes.status}`);
    }

    // Fire-and-forget audit trigger
    fetch(`${PYTHON_ENGINE_URL}/api/v1/analytics/audit?t1_start=2023-01-01 00:00:00&t1_end=2024-01-31 23:59:59&t2_start=2024-02-01 00:00:00&t2_end=2024-12-31 23:59:59`)
      .then(res => res.json())
      .then(data => console.log("[+] Data Science Engine Pipeline completed for webhook"))
      .catch(err => console.error("[-] Engine invocation failed:", err.message));

    res.status(201).json({ 
      success: true, 
      message: "Telemetry ingested securely. Meta-analysis dispatched to worker mesh."
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
app.get('/api/temporal-audit', requireSupabaseAuth, async (req, res) => {
  try {
    const { t1_start, t1_end, t2_start, t2_end } = req.query;
    
    const q_t1_start = t1_start || "2023-01-01 00:00:00";
    const q_t1_end = t1_end || "2023-01-31 23:59:59";
    const q_t2_start = t2_start || "2024-01-01 00:00:00";
    const q_t2_end = t2_end || "2024-01-31 23:59:59";

    const url = `${PYTHON_ENGINE_URL}/api/v1/analytics/audit?t1_start=${encodeURIComponent(q_t1_start)}&t1_end=${encodeURIComponent(q_t1_end)}&t2_start=${encodeURIComponent(q_t2_start)}&t2_end=${encodeURIComponent(q_t2_end)}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Python API Responded with ${response.status}`);
    
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Temporal Audit Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============== CSV INGESTION =================
app.post('/api/v1/onboarding/upload-csv', requireSupabaseAuth, upload.single('file'), async (req, res) => {
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

        // Send the payload to the Python Data Science Engine for ingestion
        const ingestRes = await fetch(`${PYTHON_ENGINE_URL}/api/v1/telemetry/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(telemetryPayload)
        });

        if (!ingestRes.ok) {
           throw new Error(`Python Engine failed to ingest CSV data: ${ingestRes.status}`);
        }
        
        // Trigger Engine directly
        fetch(`${PYTHON_ENGINE_URL}/api/v1/analytics/audit?t1_start=2023-01-01 00:00:00&t1_end=2024-01-31 23:59:59&t2_start=2024-02-01 00:00:00&t2_end=2024-12-31 23:59:59`)
          .then(res => res.json())
          .then(data => console.log("[+] Data Science Engine Pipeline completed for CSV upload"))
          .catch(err => console.error("[-] Engine invocation failed:", err.message));

        // Cleanup temp file
        fs.unlinkSync(req.file.path);

        res.status(200).json({ success: true, message: `Processed ${items.length} items from CSV.` });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
});

// Cron Jobs Disabled for Local Dev without Redis
async function configureCronJobs() {
  console.log('[+] Background Cron Jobs disabled (Running without Redis natively)');
}

// Start Server
const PORT = process.env.PORT || 3000;
configureCronJobs().then(() => {
  app.listen(PORT, () => {
    console.log(`[+] High-Performance API Gateway listening on port ${PORT}`);
    console.log(`[+] Supabase connected: ${supabaseUrl}`);
    console.log(`[+] Python Engine URL: ${PYTHON_ENGINE_URL}`);
  });
}).catch(err => {
  console.error("Failed to start server:", err);
});
