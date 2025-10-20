# 🚨 URGENT: Update Lambda Function to Fix Mock Responses

## The Problem
Your website is still showing "mock-file-" responses and the sample document because the AWS Lambda function hasn't been updated with the real S3 code.

## The Solution
You need to manually update the Lambda function in AWS Console with the new code.

## 📋 EXACT STEPS TO FIX THIS:

### Step 1: Access AWS Lambda Console
1. Go to: https://console.aws.amazon.com/lambda/
2. **IMPORTANT**: Make sure you're in the **Europe (London) eu-west-2** region (top right corner)
3. Look for a function named: **freehold-api**

### Step 2: Update the Function Code
1. Click on the **freehold-api** function name
2. In the function overview, click the **Code** tab
3. Click **Upload from** dropdown → select **.zip file**
4. Click **Browse** and select: `backend/freehold-api-lambda-FINAL.zip`
5. Click **Save**
6. Wait for "Successfully updated the function freehold-api" message

### Step 3: Update Environment Variables (CRITICAL)
1. Click the **Configuration** tab
2. Click **Environment variables** in the left sidebar
3. Click **Edit** button
4. Add/Update these variables (click **Add environment variable** for each):

```
NODE_ENV = production
AWS_REGION = eu-west-2
S3_BUCKET_NAME = freehold-documents-prod
JWT_SECRET = freehold-jwt-secret-2024-production-key
JWT_REFRESH_SECRET = freehold-refresh-secret-2024-production-key
CORS_ORIGIN = https://main.d2n7j8wrtqbawq.amplifyapp.com
MAX_FILE_SIZE = 52428800
LOG_LEVEL = info
```

5. Click **Save**

### Step 4: Test the Fix
1. Wait 30 seconds for changes to take effect
2. Go to your website: https://main.d2n7j8wrtqbawq.amplifyapp.com/dashboard
3. Try uploading a file
4. Open browser console (F12) and check:
   - Should NOT see "mock-file-" in upload responses
   - Should see real file IDs (UUIDs)
   - Sample document should disappear from the list

## 🔍 Verification Commands
Run this from your computer to test:
```bash
cd backend
node test-api.js
```

**Before fix**: Shows "mock-file-" and sample document
**After fix**: Shows real UUIDs and empty document list

## ⚠️ Troubleshooting

### If you can't find the Lambda function:
- Make sure you're in **eu-west-2** region
- The function might be named slightly differently
- Look for any function with "freehold" or "api" in the name

### If upload still shows "mock-file-":
- Check that environment variables were saved correctly
- Wait 1-2 minutes for Lambda to restart
- Clear browser cache and try again

### If you get permission errors:
- Make sure you're logged into the correct AWS account
- You need Lambda function update permissions

## 📁 Files Included:
- `freehold-api-lambda-FINAL.zip` - The deployment package with real S3 functionality
- This replaces ALL mock responses with actual file upload/download

## 🎯 Expected Results After Update:
✅ No more "mock-file-" responses
✅ Real file uploads to S3
✅ Sample document disappears
✅ Uploaded files appear in document list
✅ Files persist between page refreshes

This update will finally make your document sharing platform fully functional!