# Manual Lambda Function Update Instructions

## 🚨 CRITICAL: Your Lambda function is still running mock code!

The API is returning "mock-file-" responses because the deployed Lambda function hasn't been updated with our real S3 code.

## 📋 Manual Update Steps:

### Step 1: Access AWS Lambda Console
1. Go to: https://console.aws.amazon.com/lambda/
2. Make sure you're in the **eu-west-2** region (London)
3. Find the function named: **freehold-api**

### Step 2: Update Function Code
1. Click on the **freehold-api** function
2. Go to the **Code** tab
3. Click **Upload from** → **.zip file**
4. Upload the file: `backend/freehold-api-lambda-updated-real.zip`
5. Click **Save**

### Step 3: Update Environment Variables
1. Go to the **Configuration** tab
2. Click **Environment variables** in the left sidebar
3. Click **Edit**
4. Update/Add these variables:

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

### Step 4: Test the Update
1. Wait 30 seconds for the function to update
2. Go back to your website
3. Try uploading a file
4. Check browser console - should NOT see "mock-file-" anymore
5. The sample document should disappear
6. Uploaded files should appear in the list

## 🔍 Verification:
Run this test from your computer:
```bash
cd backend
node test-api.js
```

After the update, you should see:
- ✅ No sample document
- ✅ Real upload responses (no "mock-file-")
- ✅ Empty document list initially

## 📁 Files Created:
- `freehold-api-lambda-updated-real.zip` - The deployment package with real S3 code
- This replaces all mock responses with actual S3 file upload/download functionality

## ⚠️ Important Notes:
- The Lambda function name is: **freehold-api**
- Region must be: **eu-west-2** (London)
- Handler should be: **index.handler**
- Runtime should be: **Node.js 18.x**

## 🆘 If You Need Help:
1. Take screenshots of the AWS Lambda console
2. Run `node test-api.js` and share the output
3. Check browser console for any new error messages

This manual update will finally enable real file uploads and remove all mock responses!