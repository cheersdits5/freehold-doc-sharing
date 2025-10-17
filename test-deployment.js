#!/usr/bin/env node

/**
 * Complete Deployment Testing Script
 * Tests the entire Freehold Document Sharing Platform deployment
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🧪 Complete Deployment Testing');
console.log('==============================');

// Configuration
const config = {
  apiGatewayUrl: process.env.API_GATEWAY_URL || '',
  amplifyUrl: process.env.AMPLIFY_URL || '',
  testTimeout: 10000
};

console.log(`API Gateway URL: ${config.apiGatewayUrl || 'Not set'}`);
console.log(`Amplify URL: ${config.amplifyUrl || 'Not set'}`);

// Test utilities
async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Freehold-Deployment-Test/1.0',
        ...options.headers
      },
      timeout: config.testTimeout
    };

    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(requestOptions, (res) => {
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

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.data) {
      req.write(JSON.stringify(options.data));
    }
    
    req.end();
  });
}

// Test functions
async function testApiGatewayHealth() {
  console.log('\n🏥 Testing API Gateway Health...');
  
  if (!config.apiGatewayUrl) {
    console.log('⚠️  API Gateway URL not provided, skipping test');
    return false;
  }
  
  try {
    const response = await makeRequest(`${config.apiGatewayUrl}/health`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log('✅ API Gateway health check successful');
      console.log(`   Status: ${data.status}`);
      console.log(`   Environment: ${data.environment}`);
      console.log(`   S3 Configured: ${data.s3Configured}`);
      return true;
    } else {
      console.log(`❌ API Gateway health check failed: ${response.statusCode}`);
      console.log(`   Response: ${response.body}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ API Gateway health check error: ${error.message}`);
    return false;
  }
}

async function testApiGatewayCors() {
  console.log('\n🔍 Testing API Gateway CORS...');
  
  if (!config.apiGatewayUrl) {
    console.log('⚠️  API Gateway URL not provided, skipping test');
    return false;
  }
  
  try {
    const response = await makeRequest(`${config.apiGatewayUrl}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': config.amplifyUrl || 'https://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    const corsHeaders = {
      origin: response.headers['access-control-allow-origin'],
      methods: response.headers['access-control-allow-methods'],
      headers: response.headers['access-control-allow-headers'],
      credentials: response.headers['access-control-allow-credentials']
    };
    
    console.log('✅ CORS preflight response received');
    console.log(`   Allow-Origin: ${corsHeaders.origin}`);
    console.log(`   Allow-Methods: ${corsHeaders.methods}`);
    console.log(`   Allow-Headers: ${corsHeaders.headers}`);
    console.log(`   Allow-Credentials: ${corsHeaders.credentials}`);
    
    return response.statusCode === 200;
  } catch (error) {
    console.log(`❌ CORS test error: ${error.message}`);
    return false;
  }
}

async function testAuthentication() {
  console.log('\n🔐 Testing Authentication...');
  
  if (!config.apiGatewayUrl) {
    console.log('⚠️  API Gateway URL not provided, skipping test');
    return null;
  }
  
  try {
    const response = await makeRequest(`${config.apiGatewayUrl}/api/auth/login`, {
      method: 'POST',
      data: {
        email: 'admin@freehold.com',
        password: 'password123'
      }
    });
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log('✅ Authentication successful');
      console.log(`   Token: ${data.token ? 'Present' : 'Missing'}`);
      console.log(`   User: ${data.user ? data.user.email : 'Missing'}`);
      return data.token;
    } else {
      console.log(`❌ Authentication failed: ${response.statusCode}`);
      console.log(`   Response: ${response.body}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Authentication error: ${error.message}`);
    return null;
  }
}

async function testProtectedEndpoint(token) {
  console.log('\n🛡️  Testing Protected Endpoints...');
  
  if (!config.apiGatewayUrl) {
    console.log('⚠️  API Gateway URL not provided, skipping test');
    return false;
  }
  
  if (!token) {
    console.log('❌ No authentication token available');
    return false;
  }
  
  try {
    const response = await makeRequest(`${config.apiGatewayUrl}/api/categories`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log('✅ Protected endpoint successful');
      console.log(`   Categories: ${data.length} found`);
      return true;
    } else {
      console.log(`❌ Protected endpoint failed: ${response.statusCode}`);
      console.log(`   Response: ${response.body}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Protected endpoint error: ${error.message}`);
    return false;
  }
}

async function testAmplifyDeployment() {
  console.log('\n🌐 Testing Amplify Deployment...');
  
  if (!config.amplifyUrl) {
    console.log('⚠️  Amplify URL not provided, skipping test');
    return false;
  }
  
  try {
    const response = await makeRequest(config.amplifyUrl);
    
    if (response.statusCode === 200) {
      console.log('✅ Amplify deployment accessible');
      console.log(`   Status: ${response.statusCode}`);
      
      // Check if it's a React app
      if (response.body.includes('react') || response.body.includes('Freehold')) {
        console.log('✅ React application detected');
        return true;
      } else {
        console.log('⚠️  Response doesn\'t appear to be the React app');
        return false;
      }
    } else {
      console.log(`❌ Amplify deployment not accessible: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Amplify test error: ${error.message}`);
    return false;
  }
}

async function checkConfiguration() {
  console.log('\n📋 Checking Configuration Files...');
  
  const files = [
    'backend/.env.production',
    'backend/serverless.yml',
    'backend/src/simple-lambda.js',
    'frontend/.env.production',
    'API_GATEWAY_DEPLOYMENT_GUIDE.md'
  ];
  
  let allFilesExist = true;
  
  files.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

async function generateReport(results) {
  console.log('\n📊 Deployment Test Report');
  console.log('=========================');
  
  const report = {
    timestamp: new Date().toISOString(),
    configuration: results.configuration,
    apiGateway: {
      health: results.apiHealth,
      cors: results.cors,
      authentication: results.auth !== null,
      protectedEndpoints: results.protected
    },
    frontend: {
      accessible: results.amplify
    },
    overall: results.configuration && results.apiHealth && results.cors && 
             results.auth !== null && results.protected && results.amplify
  };
  
  console.log(JSON.stringify(report, null, 2));
  
  // Save report to file
  fs.writeFileSync('deployment-test-report.json', JSON.stringify(report, null, 2));
  console.log('\n💾 Report saved to deployment-test-report.json');
  
  if (report.overall) {
    console.log('\n🎉 All tests passed! Deployment is successful.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the issues above.');
  }
  
  return report.overall;
}

// Main test runner
async function runTests() {
  console.log('\n🚀 Starting deployment tests...');
  
  if (!config.apiGatewayUrl && !config.amplifyUrl) {
    console.log('\n⚠️  No URLs provided for testing');
    console.log('Set environment variables:');
    console.log('  export API_GATEWAY_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod');
    console.log('  export AMPLIFY_URL=https://your-app.amplifyapp.com');
    console.log('  node test-deployment.js');
    return;
  }
  
  const results = {};
  
  // Run all tests
  results.configuration = await checkConfiguration();
  results.apiHealth = await testApiGatewayHealth();
  results.cors = await testApiGatewayCors();
  results.auth = await testAuthentication();
  results.protected = await testProtectedEndpoint(results.auth);
  results.amplify = await testAmplifyDeployment();
  
  // Generate report
  const success = await generateReport(results);
  
  console.log('\n📋 Next Steps:');
  console.log('==============');
  
  if (success) {
    console.log('✅ Deployment is complete and functional!');
    console.log('1. Test the application manually in your browser');
    console.log('2. Set up monitoring and alerts');
    console.log('3. Configure custom domain (optional)');
    console.log('4. Set up backup strategies');
  } else {
    console.log('❌ Deployment has issues that need to be resolved:');
    if (!results.configuration) console.log('   - Check configuration files');
    if (!results.apiHealth) console.log('   - Fix API Gateway/Lambda deployment');
    if (!results.cors) console.log('   - Fix CORS configuration');
    if (!results.auth) console.log('   - Fix authentication endpoint');
    if (!results.protected) console.log('   - Fix protected endpoint access');
    if (!results.amplify) console.log('   - Fix frontend deployment');
    console.log('\nRefer to API_GATEWAY_DEPLOYMENT_GUIDE.md for troubleshooting.');
  }
  
  process.exit(success ? 0 : 1);
}

// Run the tests
runTests().catch((error) => {
  console.error('❌ Test runner error:', error.message);
  process.exit(1);
});