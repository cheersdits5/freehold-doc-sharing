#!/usr/bin/env node

/**
 * Frontend Production Environment Configuration Script
 * Updates .env.production with the correct API Gateway URL
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('🌐 Frontend Production Environment Configuration');
console.log('===============================================');

const envPath = path.join(__dirname, '.env.production');

// Read current environment file
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.production file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
console.log('✅ Current .env.production found');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function configureEnvironment() {
  console.log('\n📋 Please provide the following information:');
  console.log('===========================================');
  
  // Get API Gateway URL
  const apiGatewayUrl = await askQuestion(
    '\n🔗 Enter your API Gateway URL (e.g., https://abc123.execute-api.us-east-1.amazonaws.com/dev): '
  );
  
  if (!apiGatewayUrl) {
    console.log('❌ API Gateway URL is required');
    rl.close();
    return;
  }
  
  // Validate URL format
  try {
    new URL(apiGatewayUrl);
  } catch (error) {
    console.log('❌ Invalid URL format');
    rl.close();
    return;
  }
  
  // Construct API base URL
  const apiBaseUrl = apiGatewayUrl.endsWith('/') 
    ? apiGatewayUrl + 'api'
    : apiGatewayUrl + '/api';
  
  console.log(`\n✅ API Base URL will be set to: ${apiBaseUrl}`);
  
  // Ask for confirmation
  const confirm = await askQuestion('\n❓ Do you want to update .env.production with this URL? (y/N): ');
  
  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log('❌ Configuration cancelled');
    rl.close();
    return;
  }
  
  // Update environment file
  const updatedContent = envContent.replace(
    /VITE_API_BASE_URL=.*/,
    `VITE_API_BASE_URL=${apiBaseUrl}`
  );
  
  // Write updated file
  fs.writeFileSync(envPath, updatedContent);
  console.log('✅ .env.production updated successfully');
  
  // Create backup of original
  const backupPath = envPath + '.backup.' + Date.now();
  fs.writeFileSync(backupPath, envContent);
  console.log(`✅ Backup created: ${path.basename(backupPath)}`);
  
  console.log('\n🎯 Configuration Summary:');
  console.log('========================');
  console.log(`API Gateway URL: ${apiGatewayUrl}`);
  console.log(`API Base URL: ${apiBaseUrl}`);
  console.log(`Environment File: ${envPath}`);
  
  console.log('\n📋 Next Steps:');
  console.log('==============');
  console.log('1. Build the frontend: npm run build');
  console.log('2. Test the build locally: npm run preview');
  console.log('3. Deploy to Amplify');
  console.log('4. Test end-to-end functionality');
  
  // Optional: Ask if they want to build now
  const buildNow = await askQuestion('\n❓ Do you want to build the frontend now? (y/N): ');
  
  if (buildNow.toLowerCase() === 'y' || buildNow.toLowerCase() === 'yes') {
    console.log('\n🔨 Building frontend...');
    const { spawn } = require('child_process');
    
    const buildProcess = spawn('npm', ['run', 'build'], {
      stdio: 'inherit',
      shell: true
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Frontend build completed successfully');
        console.log('\n🚀 Ready for deployment to Amplify!');
      } else {
        console.log('❌ Frontend build failed');
      }
      rl.close();
    });
  } else {
    rl.close();
  }
}

// Run configuration
configureEnvironment().catch((error) => {
  console.error('❌ Configuration error:', error.message);
  rl.close();
});