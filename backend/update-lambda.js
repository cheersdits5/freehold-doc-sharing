#!/usr/bin/env node

/**
 * Lambda Function Update Script
 * Updates the Lambda function with the latest code
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'eu-west-2'
});

const lambda = new AWS.Lambda();

async function updateLambdaFunction() {
  try {
    console.log('🚀 Updating Lambda function...');
    
    // Read the zip file
    const zipPath = path.join(__dirname, 'freehold-api-lambda-real.zip');
    if (!fs.existsSync(zipPath)) {
      throw new Error('Zip file not found: ' + zipPath);
    }
    
    const zipBuffer = fs.readFileSync(zipPath);
    
    // Update function code
    const params = {
      FunctionName: 'freehold-api',
      ZipFile: zipBuffer
    };
    
    const result = await lambda.updateFunctionCode(params).promise();
    console.log('✅ Lambda function updated successfully!');
    console.log('Function ARN:', result.FunctionArn);
    console.log('Last Modified:', result.LastModified);
    
    // Update environment variables
    console.log('🔧 Updating environment variables...');
    const envParams = {
      FunctionName: 'freehold-api',
      Environment: {
        Variables: {
          NODE_ENV: 'production',
          AWS_REGION: 'eu-west-2',
          S3_BUCKET_NAME: 'freehold-documents-prod',
          JWT_SECRET: 'freehold-jwt-secret-2024-production-key',
          JWT_REFRESH_SECRET: 'freehold-refresh-secret-2024-production-key',
          CORS_ORIGIN: 'https://main.d2n7j8wrtqbawq.amplifyapp.com',
          MAX_FILE_SIZE: '52428800'
        }
      }
    };
    
    await lambda.updateFunctionConfiguration(envParams).promise();
    console.log('✅ Environment variables updated!');
    
    console.log('\n🎉 Lambda function update complete!');
    console.log('The API should now have real file upload functionality.');
    
  } catch (error) {
    console.error('❌ Error updating Lambda function:', error.message);
    
    if (error.code === 'ResourceNotFoundException') {
      console.log('\n💡 The Lambda function "freehold-api" was not found.');
      console.log('   Please check the function name or deploy it first.');
    } else if (error.code === 'AccessDenied') {
      console.log('\n💡 Access denied. Please ensure you have the correct AWS credentials.');
      console.log('   Run: aws configure');
    }
    
    process.exit(1);
  }
}

// Run the update
updateLambdaFunction();