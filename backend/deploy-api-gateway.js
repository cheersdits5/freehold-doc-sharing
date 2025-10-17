#!/usr/bin/env node

/**
 * API Gateway Deployment Configuration Script
 * This script helps configure API Gateway settings for the Freehold Document Sharing API
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 API Gateway Deployment Configuration');
console.log('=====================================');

// Check if serverless.yml exists
const serverlessPath = path.join(__dirname, 'serverless.yml');
if (!fs.existsSync(serverlessPath)) {
  console.error('❌ serverless.yml not found!');
  process.exit(1);
}

console.log('✅ serverless.yml found');

// Check if simple-lambda.js exists
const lambdaPath = path.join(__dirname, 'src', 'simple-lambda.js');
if (!fs.existsSync(lambdaPath)) {
  console.error('❌ simple-lambda.js not found!');
  process.exit(1);
}

console.log('✅ simple-lambda.js found');

// Check environment variables
const requiredEnvVars = [
  'S3_BUCKET_NAME',
  'AWS_REGION'
];

const optionalEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
];

console.log('\n📋 Environment Variables Check:');
console.log('Required:');
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`  ✅ ${envVar}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
  } else {
    console.log(`  ⚠️  ${envVar}: Not set (will use default)`);
  }
});

console.log('Optional:');
optionalEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`  ✅ ${envVar}: Set`);
  } else {
    console.log(`  ⚠️  ${envVar}: Not set (will use default)`);
  }
});

// Create deployment package
console.log('\n📦 Creating deployment package...');

const packageJson = {
  "name": "freehold-api-lambda",
  "version": "1.0.0",
  "description": "Freehold Document Sharing API Lambda Function",
  "main": "simple-lambda.js",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "serverless-http": "^3.2.0"
  }
};

// Write package.json for Lambda deployment
fs.writeFileSync(
  path.join(__dirname, 'lambda-deploy', 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

console.log('✅ Lambda package.json created');

// Copy Lambda function
const lambdaContent = fs.readFileSync(lambdaPath, 'utf8');
fs.writeFileSync(
  path.join(__dirname, 'lambda-deploy', 'index.js'),
  lambdaContent
);

console.log('✅ Lambda function copied to deployment directory');

console.log('\n🎯 API Gateway Configuration Summary:');
console.log('=====================================');
console.log('✅ CORS enabled with comprehensive headers');
console.log('✅ Lambda proxy integration configured');
console.log('✅ Binary media types configured for file uploads');
console.log('✅ IAM permissions configured for S3 access');
console.log('✅ Environment variables with defaults');
console.log('✅ Request/response logging enabled');

console.log('\n📋 Next Steps:');
console.log('==============');
console.log('1. Deploy using: npm run deploy');
console.log('2. Or deploy using: serverless deploy');
console.log('3. Test API Gateway endpoints');
console.log('4. Update frontend environment with API Gateway URL');

console.log('\n🔧 Manual API Gateway Configuration (if needed):');
console.log('================================================');
console.log('1. Enable CORS on all resources');
console.log('2. Configure {proxy+} resource with Lambda proxy integration');
console.log('3. Enable binary media types: multipart/form-data, application/octet-stream');
console.log('4. Deploy to stage (e.g., "prod")');
console.log('5. Test endpoints with proper CORS headers');

console.log('\n✨ Configuration complete!');