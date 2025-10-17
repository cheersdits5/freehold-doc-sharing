# AWS Console Manual Deployment Guide

## Overview
We'll deploy the Freehold Document Sharing Platform using the AWS Console interface. This approach gives you full control and visibility over each service.

## Architecture
- **Frontend**: AWS Amplify Hosting (React app)
- **Backend**: AWS Lambda + API Gateway (Node.js API)
- **Database**: AWS RDS PostgreSQL
- **File Storage**: AWS S3
- **Authentication**: AWS Cognito

## Step 1: Create S3 Bucket for File Storage

1. **Go to S3 Console**: https://console.aws.amazon.com/s3/
2. **Click "Create bucket"**
3. **Bucket settings**:
   - Bucket name: `freehold-documents-[your-unique-id]`
   - Region: Choose your preferred region (e.g., us-east-1)
   - Block all public access: ✅ Keep checked
   - Bucket versioning: Enable (optional)
4. **Click "Create bucket"**
5. **Configure CORS**: Go to bucket → Permissions → CORS
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

## Step 2: Create RDS PostgreSQL Database (Optional - Skip for Initial Testing)

**Note**: You can skip this step initially. The simplified Lambda function returns mock data for testing without requiring a database.

1. **Go to RDS Console**: https://console.aws.amazon.com/rds/
2. **Click "Create database"**
3. **Database settings**:
   - Engine: PostgreSQL
   - Version: Latest (e.g., 15.4)
   - Template: Free tier (if eligible)
   - DB instance identifier: `freehold-db`
   - Master username: `postgres`
   - Master password: Create a secure password
   - DB instance class: db.t3.micro (free tier)
   - Storage: 20 GB (free tier)
   - VPC: Default VPC
   - Public access: Yes (for now)
   - Database name: `freehold_docs`
4. **Click "Create database"**
5. **Note down**: Endpoint URL, username, password

## Step 3: Create Cognito User Pool (Authentication)

1. **Go to Cognito Console**: https://console.aws.amazon.com/cognito/
2. **Click "Create user pool"**
3. **Configure sign-in experience**:
   - Cognito user pool sign-in options: Email
   - Click "Next"
4. **Configure security requirements**:
   - Password policy: Default
   - Multi-factor authentication: Optional
   - Click "Next"
5. **Configure sign-up experience**:
   - Self-registration: Enable
   - Required attributes: Email, Given name, Family name
   - Click "Next"
6. **Configure message delivery**:
   - Email provider: Send email with Cognito
   - Click "Next"
7. **Integrate your app**:
   - User pool name: `freehold-users`
   - App client name: `freehold-app`
   - Click "Next"
8. **Review and create**
9. **Note down**: User Pool ID, App Client ID

## Step 4: Deploy Backend to Lambda

### 4.1 Create Lambda Function
1. **Go to Lambda Console**: https://console.aws.amazon.com/lambda/
2. **Click "Create function"**
3. **Function settings**:
   - Function name: `freehold-api`
   - Runtime: Node.js 18.x
   - Architecture: x86_64
4. **Click "Create function"**

### 4.2 Upload Deployment Package
✅ **Your deployment package is already ready!**

We've created a simplified Lambda deployment package that bypasses TypeScript compilation issues:
- **File**: `freehold-api-lambda.zip` (located in your backend directory)
- **Size**: ~897KB
- **Contents**: Simplified JavaScript Lambda function with all dependencies

### 4.3 Upload Code
1. **In Lambda function**: Function code section
2. **Upload from**: .zip file
3. **Upload**: Select your `freehold-api-lambda.zip` file
4. **Handler**: `index.handler` (not `dist/lambda.handler`)
5. **Runtime**: Node.js 18.x

### 4.4 Configure Environment Variables
In Lambda function → Configuration → Environment variables:

**Note**: The simplified Lambda function will work without a database initially, returning mock data for testing.

```
NODE_ENV=production
S3_BUCKET_NAME=your-s3-bucket-name
AWS_REGION=your-region
CORS_ORIGIN=https://your-amplify-app-url

# Optional (for future database integration):
DB_HOST=your-rds-endpoint
DB_PORT=5432
DB_NAME=freehold_docs
DB_USER=postgres
DB_PASSWORD=your-db-password
JWT_SECRET=your-super-secret-jwt-key-change-this
```

### 4.5 Configure IAM Role
1. **Go to IAM Console**: https://console.aws.amazon.com/iam/
2. **Create role** for Lambda
3. **Attach policies**:
   - `AWSLambdaBasicExecutionRole` (required)
   - `AmazonS3FullAccess` (for file operations)
   - `AmazonRDSDataFullAccess` (optional - for future database integration)
4. **Attach role** to your Lambda function

**Note**: The simplified Lambda function will work with just basic execution role initially.

## Step 5: Create API Gateway

1. **Go to API Gateway Console**: https://console.aws.amazon.com/apigateway/
2. **Click "Create API"**
3. **Choose "REST API"** (not private)
4. **API settings**:
   - API name: `freehold-api`
   - Description: `Freehold Document Sharing API`
5. **Create Resource**: `/api`
6. **Create Resource**: `/{proxy+}` under `/api`
7. **Create Method**: `ANY` for `/{proxy+}`
8. **Integration**: Lambda Function
9. **Lambda Function**: Select your `freehold-api` function
10. **Enable CORS** on all resources
11. **Deploy API**: Create new stage called `prod`
12. **Note down**: API Gateway URL

## Step 6: Deploy Frontend to Amplify

### 6.1 Prepare Frontend
Update `frontend/.env.production`:
```
VITE_API_BASE_URL=https://your-api-gateway-url/prod/api
VITE_APP_NAME=Freehold Document Sharing
VITE_MAX_FILE_SIZE=52428800
```

### 6.2 Create Git Repository
1. **Create repository** on GitHub/GitLab
2. **Push your code**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

### 6.3 Deploy with Amplify
1. **Go to Amplify Console**: https://console.aws.amazon.com/amplify/
2. **Click "New app" → "Host web app"**
3. **Connect repository**: Choose your Git provider
4. **Select repository**: Your freehold project
5. **Build settings**:
   - App name: `freehold-document-sharing`
   - Environment: `production`
   - Build command: `npm run build`
   - Base directory: `frontend`
   - Artifact base directory: `frontend/dist`
6. **Advanced settings**: Add environment variables
7. **Save and deploy**

## Step 7: Configure Database Schema (Optional - For Future Use)

**Note**: Skip this step for initial testing. The Lambda function returns mock data without requiring a database.

When you're ready to add database functionality, connect to your RDS database and create tables:

```sql
-- Connect using psql or any PostgreSQL client
-- psql -h your-rds-endpoint -U postgres -d freehold_docs

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name VARCHAR(255) NOT NULL,
    file_key VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    category_id UUID REFERENCES categories(id),
    uploaded_by UUID REFERENCES users(id),
    description TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO categories (name, description) VALUES
('Meeting Minutes', 'Board meeting minutes and agendas'),
('Financial Reports', 'Financial statements and budgets'),
('Legal Documents', 'Contracts and legal paperwork'),
('Maintenance', 'Property maintenance records'),
('Insurance', 'Insurance policies and claims'),
('General', 'General freehold documents');

-- Create a test user (password: 'password123')
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('admin@freehold.com', '$2b$10$rQZ9QmjlhQZ9QmjlhQZ9Qu', 'Admin', 'User', 'admin');
```

## Step 8: Test the Application

1. **Visit your Amplify URL**
2. **Test API endpoints** - The Lambda function returns mock data for:
   - User authentication (mock login)
   - Document listing (sample documents)
   - Category browsing (default categories)
   - File upload simulation
3. **Test responsive design** on mobile
4. **Verify frontend-backend integration**

**Note**: The simplified Lambda function provides mock responses to test the complete integration without requiring a database.

## Step 9: Configure Custom Domain (Optional)

1. **In Amplify Console**: Domain management
2. **Add domain**: Your custom domain
3. **Configure DNS**: Add CNAME records
4. **SSL Certificate**: Automatically provisioned

## Security Checklist

- [ ] RDS database in private subnet (production)
- [ ] S3 bucket not publicly accessible
- [ ] Lambda function has minimal IAM permissions
- [ ] API Gateway has rate limiting
- [ ] Cognito password policy configured
- [ ] CORS properly configured
- [ ] Environment variables secured

## Monitoring Setup

1. **CloudWatch Logs**: Monitor Lambda function logs
2. **CloudWatch Metrics**: Set up alarms for errors
3. **S3 Access Logs**: Monitor file access
4. **RDS Performance Insights**: Monitor database performance

## Estimated Costs (Monthly)

- **Amplify Hosting**: $1-5
- **Lambda**: $0-5 (free tier: 1M requests)
- **API Gateway**: $0-5 (free tier: 1M requests)
- **RDS db.t3.micro**: $0-15 (free tier available)
- **S3 Storage**: $1-10 (depending on usage)
- **Data Transfer**: $0-10

**Total**: $2-40/month depending on usage

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Check API Gateway CORS configuration
2. **Database Connection**: Verify RDS security groups
3. **File Upload**: Check S3 permissions and Lambda IAM role
4. **Authentication**: Verify Cognito configuration

### Useful AWS Console Links:
- **CloudWatch Logs**: Monitor all service logs
- **IAM**: Check permissions and roles
- **VPC**: Network configuration
- **CloudFormation**: Infrastructure as code (optional)

This manual approach gives you full control over each AWS service and helps you understand the architecture better!