#!/usr/bin/env node

/**
 * API Test Script
 * Tests the deployed API to see what version is running
 */

const https = require('https');

const API_BASE = 'https://wdjv9gq946.execute-api.eu-west-2.amazonaws.com/prod';

async function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': 'Bearer mock-jwt-token-user1',
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testAPI() {
  console.log('🧪 Testing Deployed API');
  console.log('=======================');
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const health = await makeRequest('/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response:`, health.data);
    
    // Test files endpoint
    console.log('\n2. Testing files endpoint...');
    const files = await makeRequest('/api/files');
    console.log(`   Status: ${files.status}`);
    console.log(`   Documents found: ${files.data.documents ? files.data.documents.length : 'N/A'}`);
    if (files.data.documents && files.data.documents.length > 0) {
      console.log(`   First document: ${files.data.documents[0].originalName}`);
      if (files.data.documents[0].originalName === 'sample-document.pdf') {
        console.log('   ⚠️  STILL SHOWING MOCK SAMPLE DOCUMENT');
      }
    } else {
      console.log('   ✅ No documents (expected for real implementation)');
    }
    
    // Test categories endpoint
    console.log('\n3. Testing categories endpoint...');
    const categories = await makeRequest('/api/categories');
    console.log(`   Status: ${categories.status}`);
    console.log(`   Categories: ${categories.data.length || 'N/A'}`);
    
    // Test upload endpoint (without actual file)
    console.log('\n4. Testing upload endpoint structure...');
    const upload = await makeRequest('/api/files/upload', 'POST');
    console.log(`   Status: ${upload.status}`);
    console.log(`   Response:`, upload.data);
    
    if (upload.data.id && upload.data.id.startsWith('mock-file-')) {
      console.log('   ❌ STILL RETURNING MOCK RESPONSES');
      console.log('   🔧 The Lambda function needs to be updated with real code');
    } else {
      console.log('   ✅ Real implementation detected');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();