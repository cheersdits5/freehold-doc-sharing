#!/usr/bin/env node

/**
 * Lambda Environment Configuration Script
 * Helps configure Lambda function environment variables and permissions
 */

const fs = require('fs');
const path = require('path');

console.log('⚙️  Lambda Environment Configuration');
console.log('===================================');

// Read production environment file
const envPath = path.join(__dirname, '.env.production');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.production file not found!');
  console.log('   Please create .env.production with your configuration');
  process.exit(1);
}

console.log('✅ .env.production found');

// Parse environment variables
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key] = valueParts.join('=');
    }
  }
});

console.log(`✅ Parsed ${Object.keys(envVars).length} environment variables`);

// Generate AWS CLI commands for setting Lambda environment variables
console.log('\n📋 AWS CLI Commands for Lambda Environment Variables:');
console.log('=====================================================');

const lambdaFunctionName = 'freehold-api'; // Update this to match your function name

console.log('# Set all environment variables at once:');
console.log(`aws lambda update-function-configuration \\`);
console.log(`  --function-name ${lambdaFunctionName} \\`);
console.log(`  --environment Variables='{`);

const envEntries = Object.entries(envVars);
envEntries.forEach(([key, value], index) => {
  const isLast = index === envEntries.length - 1;
  console.log(`    "${key}":"${value}"${isLast ? '' : ','}`);
});

console.log(`  }'`);

console.log('\n# Or set individual variables:');
Object.entries(envVars).forEach(([key, value]) => {
  console.log(`aws lambda update-function-configuration --function-name ${lambdaFunctionName} --environment Variables='{"${key}":"${value}"}'`);
});

// Generate IAM policy for Lambda function
console.log('\n🔐 Required IAM Policy for Lambda Function:');
console.log('==========================================');

const iamPolicy = {
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
      ],
      "Resource": `arn:aws:s3:::${envVars.S3_BUCKET_NAME || 'freehold-documents-*'}/*`
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": `arn:aws:s3:::${envVars.S3_BUCKET_NAME || 'freehold-documents-*'}`
    }
  ]
};

// Add RDS permissions if database is configured
if (envVars.DB_HOST) {
  iamPolicy.Statement.push({
    "Effect": "Allow",
    "Action": [
      "rds-db:connect"
    ],
    "Resource": `arn:aws:rds-db:${envVars.AWS_REGION || 'us-east-1'}:*:dbuser:*/postgres`
  });
}

console.log(JSON.stringify(iamPolicy, null, 2));

// Generate Lambda function configuration
console.log('\n⚡ Lambda Function Configuration:');
console.log('================================');

const lambdaConfig = {
  "FunctionName": lambdaFunctionName,
  "Runtime": "nodejs18.x",
  "Handler": "index.handler",
  "Timeout": 30,
  "MemorySize": 512,
  "Environment": {
    "Variables": envVars
  }
};

console.log(JSON.stringify(lambdaConfig, null, 2));

// Generate deployment checklist
console.log('\n📋 Lambda Deployment Checklist:');
console.log('===============================');
console.log('□ 1. Create S3 bucket for file storage');
console.log('□ 2. Create Lambda function with Node.js 18.x runtime');
console.log('□ 3. Upload deployment package (freehold-api-lambda.zip)');
console.log('□ 4. Set handler to "index.handler"');
console.log('□ 5. Configure environment variables (see AWS CLI commands above)');
console.log('□ 6. Attach IAM role with required permissions (see policy above)');
console.log('□ 7. Set timeout to 30 seconds');
console.log('□ 8. Set memory to 512 MB');
console.log('□ 9. Create API Gateway and connect to Lambda');
console.log('□ 10. Test Lambda function through API Gateway');

// Generate test commands
console.log('\n🧪 Testing Commands:');
console.log('===================');
console.log('# Test Lambda function directly:');
console.log(`aws lambda invoke --function-name ${lambdaFunctionName} --payload '{"httpMethod":"GET","path":"/health"}' response.json`);
console.log('');
console.log('# Test through API Gateway:');
console.log('export API_GATEWAY_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev');
console.log('node test-api-gateway.js');

console.log('\n✨ Configuration complete!');
console.log('');
console.log('🔧 Manual Steps Required:');
console.log('=========================');
console.log('1. Create/update Lambda function in AWS Console');
console.log('2. Set environment variables using AWS CLI commands above');
console.log('3. Attach IAM role with the policy shown above');
console.log('4. Test Lambda function execution');
console.log('5. Connect API Gateway to Lambda function');
console.log('6. Test API Gateway endpoints');

// Save configuration files
const configDir = path.join(__dirname, 'aws-config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir);
}

// Save IAM policy
fs.writeFileSync(
  path.join(configDir, 'lambda-iam-policy.json'),
  JSON.stringify(iamPolicy, null, 2)
);

// Save Lambda configuration
fs.writeFileSync(
  path.join(configDir, 'lambda-config.json'),
  JSON.stringify(lambdaConfig, null, 2)
);

console.log('\n💾 Configuration files saved to aws-config/ directory');
console.log('   - lambda-iam-policy.json');
console.log('   - lambda-config.json');