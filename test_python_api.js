import http from 'http';

const testPayload = JSON.stringify({
  t1_start: "2023-01-01 00:00:00",
  t1_end: "2023-01-31 23:59:59",
  t2_start: "2024-01-01 00:00:00",
  t2_end: "2024-01-31 23:59:59"
});

const options = {
  hostname: '127.0.0.1',
  port: 8000,
  path: `/api/v1/analytics/audit?t1_start=${encodeURIComponent("2023-01-01 00:00:00")}&t1_end=${encodeURIComponent("2023-01-31 23:59:59")}&t2_start=${encodeURIComponent("2024-01-01 00:00:00")}&t2_end=${encodeURIComponent("2024-01-31 23:59:59")}`,
  method: 'GET',
};

console.log("=> Firing cross-communication test to Python API (Port 8000)...");

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`\n[+] Python API responded with status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      const parsed = JSON.parse(data);
      console.log("[+] Received Temporal Inference Payload:");
      console.log(JSON.stringify(parsed.intelligence_payload, null, 2));
    } else {
      console.log("[-] Error response from Python API:", data);
    }
  });
});

req.on('error', (error) => {
  console.error("[-] Connection failed. Is the Python FastAPI server running on port 8000?");
  console.error(error.message);
});

req.end();
