const fs = require('fs');
const path = require('path');

function verifySetup() {
  console.log('🔍 Verifying Frontend-Backend Integration Setup...\n');

  const checks = [];

  // Check 1: Environment files exist
  const backendEnvPath = path.join(__dirname, '../backend/.env');
  const frontendEnvPath = path.join(__dirname, '../frontend/.env');
  
  if (fs.existsSync(backendEnvPath)) {
    checks.push('✅ Backend .env file exists');
  } else {
    checks.push('❌ Backend .env file missing');
  }

  if (fs.existsSync(frontendEnvPath)) {
    checks.push('✅ Frontend .env file exists');
  } else {
    checks.push('❌ Frontend .env file missing');
  }

  // Check 2: Package.json files have correct scripts
  const rootPackageJson = require('../package.json');
  if (rootPackageJson.scripts && rootPackageJson.scripts.dev) {
    checks.push('✅ Root package.json has dev script for concurrent execution');
  } else {
    checks.push('❌ Root package.json missing dev script');
  }

  // Check 3: Vite config has correct proxy
  const viteConfigPath = path.join(__dirname, '../frontend/vite.config.ts');
  if (fs.existsSync(viteConfigPath)) {
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
    if (viteConfig.includes('localhost:3001')) {
      checks.push('✅ Vite proxy configured for backend port 3001');
    } else {
      checks.push('❌ Vite proxy not configured correctly');
    }
  }

  // Check 4: API client configuration
  const apiClientPath = path.join(__dirname, '../frontend/src/utils/apiClient.ts');
  if (fs.existsSync(apiClientPath)) {
    const apiClient = fs.readFileSync(apiClientPath, 'utf8');
    if (apiClient.includes("'/api'")) {
      checks.push('✅ API client configured to use proxy');
    } else {
      checks.push('❌ API client not configured correctly');
    }
  }

  // Check 5: Backend port configuration
  const backendIndexPath = path.join(__dirname, '../backend/src/index.ts');
  if (fs.existsSync(backendIndexPath)) {
    const backendIndex = fs.readFileSync(backendIndexPath, 'utf8');
    if (backendIndex.includes('3001')) {
      checks.push('✅ Backend configured for port 3001');
    } else {
      checks.push('❌ Backend port configuration unclear');
    }
  }

  // Print results
  checks.forEach(check => console.log(check));

  const failedChecks = checks.filter(check => check.startsWith('❌'));
  
  if (failedChecks.length === 0) {
    console.log('\n🎉 All setup checks passed!');
    console.log('\nTo start the application:');
    console.log('1. npm run dev (starts both frontend and backend)');
    console.log('2. Visit http://localhost:3000');
    console.log('3. Backend API available at http://localhost:3001');
    console.log('\nTo test the connection:');
    console.log('node test-connection.js');
  } else {
    console.log(`\n⚠️  ${failedChecks.length} setup issues found. Please fix them before starting the application.`);
  }
}

verifySetup();