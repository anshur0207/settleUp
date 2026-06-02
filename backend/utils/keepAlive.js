const https = require('https');
const http = require('http');
const port = process.env.PORT || 5000;
const url = process.env.RENDER_EXTERNAL_URL 
  ? `${process.env.RENDER_EXTERNAL_URL}/health` 
  : process.env.BACKEND_URL || `http://localhost:${port}/health`;

function ping() {
  const protocol = url.startsWith('https') ? https : http;
  protocol.get(url, (res) => {
    if (res.statusCode === 200) {
      console.log(`[Keep-Alive] Pinged ${url} successfully.`);
    } else {
      console.log(`[Keep-Alive] Failed to ping ${url}. Status code: ${res.statusCode}`);
    }
  }).on('error', (err) => {
    console.error(`[Keep-Alive] Error pinging ${url}:`, err.message);
  });
}

// Ping every 10 minutes (600000 ms)
setInterval(ping, 600000);
console.log(`[Keep-Alive] Started. Will ping ${url} every 10 minutes to prevent cold starts.`);
