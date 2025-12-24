const https = require('https');

// Test login request similar to what the frontend does
const loginData = JSON.stringify({
  username: 'admin',
  password: 'admin123'
});

const options = {
  hostname: 'backend-production-cde7.up.railway.app',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length,
    'Origin': 'https://stock-management-system-frontend.vercel.app', // Simulate frontend request
    'User-Agent': 'Mozilla/5.0 (Frontend-Test)'
  }
};

console.log('🧪 Testing login API with Origin header...');
console.log('Options:', options);

const req = https.request(options, (res) => {
  console.log(`✅ Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`📄 Response Body:`, data);
    try {
      const jsonResponse = JSON.parse(data);
      console.log(`🎉 Parsed Response:`, jsonResponse);
    } catch (e) {
      console.log(`❌ Failed to parse JSON:`, e.message);
    }
  });
});

req.on('error', (error) => {
  console.error(`❌ Request Error:`, error);
});

// Write data to request body
req.write(loginData);
req.end();
