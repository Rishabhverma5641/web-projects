// Quick test script — run with: node test-lead.js
const http = require('http');

const body = JSON.stringify({
  name:  'Test User',
  email: 'test@example.com',
  phone: '9876543210',
  goal:  'Lose weight',
});

const req = http.request({
  hostname: 'localhost',
  port:     3000,
  path:     '/api/leads',
  method:   'POST',
  headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
}, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', e => console.error('Error:', e.message));
req.write(body);
req.end();
