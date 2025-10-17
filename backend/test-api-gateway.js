#!/usr/bin/env node

/**
 * API Gateway Testing Script
 * Tests API Gateway endpoints and CORS configuration
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = process.env.API_GATEWAY_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev';

console.log('🧪 Testing API Gateway Configuration');
console.log('====================================');
console.log(`Base URL: ${API_BASE_URL}`);

// Test function
async function testEndpoint(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://localhost:3000',
        ...headers
      }
    };

    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test CORS preflight
async function testCORS() {
  console.log('\n🔍 Testing CORS Configuration...');
  
  try {
    const response = await testEndpoint('OPTIONS', '/api/auth/login', null, {
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization'
    });
    
    console.log(`Status: ${response.statusCode}`);
    console.log('CORS Headers:');
    console.log(`  Access-Control-Allow-Origin: ${response.headers['access-control-allow-origin']}`);
    console.log(`  Access-Control-Allow-Methods: ${response.headers['access-control-allow-methods']}`);
    console.log(`  Access-Control-Allow-Headers: ${response.headers['access-control-allow-headers']}`);
    console.log(`  Access-Control-Allow-Credentials: ${response.headers['access-control-allow-credentials']}`);
    
    if (response.statusCode === 200) {
      console.log('✅ CORS preflight successful');
    } else {
      console.log('❌ CORS preflight failed');
    }
  } catch (error) {
    console.log('❌ CORS test failed:', error.message);
  }
}

// Test health endpoint
async function testHealth() {
  console.log('\n🏥 Testing Health Endpoint...');
  
  try {
    const response = await testEndpoint('GET', '/health');
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log('✅ Health check successful');
      console.log(`  Status: ${data.status}`);
      console.log(`  Version: ${data.version}`);
    } else {
      console.log('❌ Health check failed');
      console.log(`  Response: ${response.body}`);
    }
  } catch (error) {
    console.log('❌ Health test failed:', error.message);
  }
}

// Test authentication endpoint
async function testAuth() {
  console.log('\n🔐 Testing Authentication Endpoint...');
  
  try {
    const response = await testEndpoint('POST', '/api/auth/login', {
      email: 'admin@freehold.com',
      password: 'password123'
    });
    
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log('✅ Authentication successful');
      console.log(`  Token: ${data.token ? 'Present' : 'Missing'}`);
      console.log(`  User: ${data.user ? data.user.email : 'Missing'}`);
      return data.token;
    } else {
      console.log('❌ Authentication failed');
      console.log(`  Response: ${response.body}`);
    }
  } catch (error) {
    console.log('❌ Authentication test failed:', error.message);
  }
  
  return null;
}

// Test protected endpoint
async function testProtectedEndpoint(token) {
  console.log('\n🛡️  Testing Protected Endpoint...');
  
  if (!token) {
    console.log('❌ No token available for protected endpoint test');
    return;
  }
  
  try {
    const response = await testEndpoint('GET', '/api/categories', null, {
      'Authorization': `Bearer ${token}`
    });
    
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log('✅ Protected endpoint successful');
      console.log(`  Categories: ${data.length} found`);
    } else {
      console.log('❌ Protected endpoint failed');
      console.log(`  Response: ${response.body}`);
    }
  } catch (error) {
    console.log('❌ Protected endpoint test failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  if (!process.env.API_GATEWAY_URL) {
    console.log('⚠️  API_GATEWAY_URL environment variable not set');
    console.log('   Set it to your API Gateway URL to run tests');
    console.log('   Example: export API_GATEWAY_URL=https://abc123.execute-api.us-east-1.amazonaws.com/dev');
    return;
  }
  
  await testCORS();
  await testHealth();
  const token = await testAuth();
  await testProtectedEndpoint(token);
  
  console.log('\n🎯 Test Summary');
  console.log('===============');
  console.log('✅ CORS configuration tested');
  console.log('✅ Health endpoint tested');
  console.log('✅ Authentication flow tested');
  console.log('✅ Protected endpoint tested');
  
  console.log('\n📋 Next Steps:');
  console.log('==============');
  console.log('1. If tests pass, API Gateway is properly configured');
  console.log('2. Update frontend .env.production with API Gateway URL');
  console.log('3. Deploy frontend to Amplify');
  console.log('4. Test end-to-end functionality');
}

// Run the tests
runTests().catch(console.error);