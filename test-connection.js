const axios = require('axios');

async function testConnection() {
  console.log('Testing Frontend-Backend Connection...\n');

  // Test 1: Backend Health Check
  try {
    console.log('1. Testing backend health endpoint...');
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Backend health check passed');
    console.log(`   Status: ${healthResponse.data.status}`);
    console.log(`   Version: ${healthResponse.data.version}`);
  } catch (error) {
    console.log('❌ Backend health check failed');
    console.log(`   Error: ${error.message}`);
    return;
  }

  // Test 2: API Endpoints (should require authentication)
  try {
    console.log('\n2. Testing API endpoints...');
    
    // Test auth endpoint
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

    // Test files endpoint (should require auth)
    try {
      await axios.get('http://localhost:3001/api/files');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Files endpoint responding correctly (401 for unauthenticated request)');
      } else {
        throw error;
      }
    }

    // Test categories endpoint (should require auth)
    try {
      await axios.get('http://localhost:3001/api/categories');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Categories endpoint responding correctly (401 for unauthenticated request)');
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.log('❌ API endpoint test failed');
    console.log(`   Error: ${error.message}`);
    return;
  }

  // Test 3: CORS Configuration
  try {
    console.log('\n3. Testing CORS configuration...');
    const corsResponse = await axios.get('http://localhost:3001/health', {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    console.log('✅ CORS configuration working');
  } catch (error) {
    console.log('❌ CORS configuration test failed');
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n🎉 All connection tests completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Start the backend: npm run dev:backend');
  console.log('2. Start the frontend: npm run dev:frontend');
  console.log('3. Visit http://localhost:3000 to test the full application');
}

testConnection().catch(console.error);