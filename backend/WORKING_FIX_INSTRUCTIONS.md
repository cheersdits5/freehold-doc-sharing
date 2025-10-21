# Lambda Deployment Guide

## Available Versions

### `freehold-lambda-WORKING-FIX.zip`
- ✅ Stable, minimal version
- ✅ Proper CORS handling
- ✅ Basic endpoints working
- ✅ No crashes or 502 errors

### `freehold-lambda-REAL-S3.zip`
- ✅ Full S3 integration
- ⚠️ More complex, may need debugging

## Deployment Steps

1. **AWS Lambda Console**: https://console.aws.amazon.com/lambda/
2. **Click**: `freehold-lambda` function
3. **Code tab** → **Upload from** → **.zip file**
4. **Select**: Choose appropriate zip file
5. **Click Save**

## Current Issue: Frontend Routing

The main issue is React Router + Amplify hosting:
- Add `_redirects` file to frontend/public/
- Or configure Amplify redirect rules
- This fixes the 404 errors on page refresh