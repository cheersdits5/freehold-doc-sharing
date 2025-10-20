#!/usr/bin/env node

/**
 * Direct Lambda Deployment Script
 * This script directly updates the Lambda function using AWS SDK
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Try to use environment variables or default region
const region = process.env.AWS_REGION || 'eu-west-2';

console.log('🚀 Direct Lambda Function Update');
console.log('================================');
console.log(`Region: ${region}`);

// Configure AWS SDK
AWS.config.update({ region });

const lambda = new AWS.Lambda();

async function deployLambda() {
  try {
    // Check if zip file exists
    const zipPath = path.join(__dirname, 'freehold-api-lambda-real.zip');
    if (!fs.existsSync(zipPath)) {
      console.error('❌ Zip file not found:', zipPath);
      console.log('   Please run: npm run package-lambda');
      return;
    }

    console.log('📦 Reading deployment package...');
    const zipBuffer = fs.readFileSync(zipPath);
    console.log(`   Package size: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Update function code
    console.log('🔄 Updating Lambda function code...');
    const updateParams = {
      FunctionName: 'freehold-api',
      ZipFile: zipBuffer
    };

    const result = await lambda.updateFunctionCode(updateParams).promise();
    console.log('✅ Function code updated successfully!');
    console.log(`   Function ARN: ${result.FunctionArn}`);
    console.log(`   Last Modified: ${result.LastModified}`);
    console.log(`   Code Size: ${(result.CodeSize / 1024 / 1024).toFixed(2)} MB`);

    // Update environment variables
    console.log('🔧 Updating environment variables...');
    const envParams = {
      FunctionName: 'freehold-api',
      Environment: {
        Variables: {
          NODE_ENV: 'production',
          AWS_REGION: 'eu-west-2',
          S3_BUCKET_NAME: 'freehold-documents-prod',
          JWT_SECRET: 'freehold-jwt-secret-2024-production-key-change-in-production',
          JWT_REFRESH_SECRET: 'freehold-refresh-secret-2024-production-key-change-in-production',
          CORS_ORIGIN: 'https://main.d2n7j8wrtqbawq.amplifyapp.com',
          MAX_FILE_SIZE: '52428800',
          LOG_LEVEL: 'info'
        }
      }
    };

    await lambda.updateFunctionConfiguration(envParams).promise();
    console.log('✅ Environment variables updated!');

    console.log('\n🎉 Lambda deployment complete!');
    console.log('   The API should now support real file uploads.');
    console.log('   Test the upload functionality in your app.');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    
    if (error.code === 'ResourceNotFoundException') {
      console.log('\n💡 Lambda function "freehold-api" not found.');
      console.log('   Please check the function name in AWS Console.');
    } else if (error.code === 'AccessDenied' || error.code === 'UnauthorizedOperation') {
      console.log('\n💡 Access denied - AWS credentials not configured.');
      console.log('   This script needs AWS credentials to work.');
      console.log('   Options:');
      console.log('   1. Run: aws configure');
      console.log('   2. Set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
      console.log('   3. Use IAM roles if running on EC2');
    } else if (error.code === 'InvalidParameterValueException') {
      console.log('\n💡 Invalid parameter - check the zip file and function name.');
    }
    
    console.log('\n🔍 Error details:');
    console.log(`   Code: ${error.code}`);
    console.log(`   Message: ${error.message}`);
  }
}

// Check AWS credentials
async function checkCredentials() {
  try {
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity().promise();
    console.log('✅ AWS credentials found');
    console.log(`   Account: ${identity.Account}`);
    console.log(`   User/Role: ${identity.Arn}`);
    return true;
  } catch (error) {
    console.log('❌ No AWS credentials found');
    console.log('   Please configure AWS credentials first.');
    return false;
  }
}

// Main execution
async function main() {
  const hasCredentials = await checkCredentials();
  if (hasCredentials) {
    await deployLambda();
  } else {
    console.log('\n📋 To configure AWS credentials:');
    console.log('   1. Install AWS CLI: https://aws.amazon.com/cli/');
    console.log('   2. Run: aws configure');
    console.log('   3. Enter your AWS Access Key ID and Secret Access Key');
    console.log('   4. Run this script again');
  }
}

main();