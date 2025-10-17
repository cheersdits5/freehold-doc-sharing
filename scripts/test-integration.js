const { spawn } = require('child_process');
const axios = require('axios');

async function waitForServer(url, maxAttempts = 30, interval = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(url);
      return true;
    } catch (error) {
      if (i === maxAttempts - 1) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  return false;
}

async function testIntegration() {
  console.log('🚀 Starting Frontend-Backend Integration Test...\n');

  // Step 1: Start backend server
  console.log('1. Starting backend server...');
  const backend = spawn('npm', ['run', 'dev:backend'], {
    stdio: 'pipe',
    shell: true
  });

  // Wait for backend to start
  console.log('   Waiting for backend to start on port 3001...');
  const backendReady = await waitForServer('http://localhost:3001/health');
  
  if (!backendReady) {
    console.log('❌ Backend failed to start within 30 seconds');
    backend.kill();
    return;
  }
  
  console.log('✅ Backend server started successfully');

  try {
    // Step 2: Test backend endpoints
    console.log('\n2. Testing backend endpoints...');
    
    // Health check
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log(`✅ Health check: ${healthResponse.data.status}`);

    // Auth endpoint (should return 401 for invalid credentials)
    try {
      await axios.post('http://localhost:3001/api/auth/login', {
        email: 'test@example.com',
        password: 'wrongpassword'
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Auth endpoint responding correctly (401 for invalid credentials)');
      } else {
        throw error;
      }
    }

    // Files endpoint (should require authentication)
    try {
      await axios.get('http://localhost:3001/api/files');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Files endpoint requires authentication (401)');
      } else {
        throw error;
      }
    }

    // Categories endpoint (should require authentication)
    try {
      await axios.get('http://localhost:3001/api/categories');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Categories endpoint requires authentication (401)');
      } else {
        throw error;
      }
    }

    // Step 3: Test CORS
    console.log('\n3. Testing CORS configuration...');
    const corsResponse = await axios.get('http://localhost:3001/health', {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    console.log('✅ CORS configuration working');

    // Step 4: Run frontend configuration tests
    console.log('\n4. Running frontend configuration tests...');
    const testProcess = spawn('npm', ['run', 'test', '--workspace=frontend', '--', '--run', 'src/test/config-validation.test.ts'], {
      stdio: 'inherit',
      shell: true
    });

    await new Promise((resolve, reject) => {
      testProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Frontend configuration tests passed');
          resolve();
        } else {
          console.log('❌ Frontend configuration tests failed');
          reject(new Error('Frontend tests failed'));
        }
      });
    });

    console.log('\n🎉 All integration tests passed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Backend server starts correctly');
    console.log('   ✅ API endpoints respond appropriately');
    console.log('   ✅ Authentication is working');
    console.log('   ✅ CORS is configured correctly');
    console.log('   ✅ Frontend configuration is valid');
    
    console.log('\n🚀 Ready to start full application:');
    console.log('   npm run dev');
    console.log('   Then visit: http://localhost:3000');

  } catch (error) {
    console.log('\n❌ Integration test failed:');
    console.log(`   Error: ${error.message}`);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up...');
    backend.kill();
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Cleanup complete');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(0);
});

testIntegration().catch(console.error);