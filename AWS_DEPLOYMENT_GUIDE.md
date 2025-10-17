# AWS Amplify Deployment Guide

## Prerequisites

1. **AWS Account**: Sign up at https://aws.amazon.com/
2. **AWS CLI**: Already installed via Amplify CLI
3. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, etc.)

## Step 1: Configure AWS Credentials

Run this command and follow the prompts:
```bash
amplify configure
```

You'll need to:
1. Sign in to AWS Console: https://console.aws.amazon.com/
2. Create an IAM user with programmatic access
3. Attach the `AdministratorAccess` policy (for simplicity)
4. Copy the Access Key ID and Secret Access Key

## Step 2: Initialize Amplify Project

```bash
amplify init
```

Choose these options:
- Project name: `freehold-document-sharing`
- Environment name: `dev`
- Default editor: `Visual Studio Code`
- App type: `javascript`
- Framework: `react`
- Source directory: `frontend/src`
- Build directory: `frontend/dist`
- Build command: `npm run build`
- Start command: `npm run dev`

## Step 3: Add Authentication

```bash
amplify add auth
```

Choose:
- Default configuration
- Username (or Email if preferred)
- No advanced settings

## Step 4: Add API (Backend)

```bash
amplify add api
```

Choose:
- REST API
- Friendly name: `freeholdapi`
- Path: `/api`
- Lambda source: Create new Lambda function
- Function name: `freeholdapi`
- Template: `Serverless ExpressJS function`

## Step 5: Add Storage (S3)

```bash
amplify add storage
```

Choose:
- Content (Images, audio, video, etc.)
- Friendly name: `freeholdstorage`
- Bucket name: Accept default
- Access: Auth users only
- Permissions: Create/update, Read, Delete

## Step 6: Add Database

```bash
amplify add storage
```

Choose:
- NoSQL Database (DynamoDB) for simplicity
- Or configure RDS PostgreSQL separately

## Step 7: Deploy to AWS

```bash
amplify push
```

This will:
- Create all AWS resources
- Deploy your backend API
- Set up authentication
- Configure S3 storage
- Provide you with API endpoints

## Step 8: Deploy Frontend

```bash
amplify add hosting
```

Choose:
- Amplify Console (Managed hosting)
- Manual deployment

Then:
```bash
amplify publish
```

## Environment Variables

After deployment, you'll need to update these in the Amplify Console:

### Backend Environment Variables
- `JWT_SECRET`: Generate a secure random string
- `JWT_REFRESH_SECRET`: Generate another secure random string
- `NODE_ENV`: `production`
- `CORS_ORIGIN`: Your Amplify app URL

### Frontend Environment Variables
- `VITE_API_BASE_URL`: Your API Gateway URL (provided after deployment)

## Post-Deployment Steps

1. **Update CORS**: Add your Amplify app URL to backend CORS configuration
2. **Test Authentication**: Create a test user account
3. **Test File Upload**: Verify S3 integration works
4. **Set up Custom Domain** (optional): Configure your own domain name

## Monitoring and Logs

- **CloudWatch Logs**: Monitor backend API logs
- **Amplify Console**: Monitor frontend deployments
- **S3 Console**: Monitor file uploads

## Costs

Estimated monthly costs for light usage:
- **Amplify Hosting**: ~$1-5/month
- **Lambda Functions**: ~$0-5/month
- **S3 Storage**: ~$1-10/month depending on files
- **DynamoDB**: ~$0-5/month
- **API Gateway**: ~$0-5/month

Total: ~$2-30/month depending on usage

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Update CORS configuration in backend
2. **Authentication Issues**: Check Cognito configuration
3. **File Upload Issues**: Verify S3 permissions
4. **API Errors**: Check CloudWatch logs

### Useful Commands:
```bash
amplify status          # Check current status
amplify console         # Open Amplify Console
amplify env list        # List environments
amplify pull            # Pull latest backend config
```

## Security Best Practices

1. **IAM Roles**: Use least privilege principle
2. **Environment Variables**: Never commit secrets to Git
3. **HTTPS**: Always use HTTPS in production
4. **Authentication**: Enable MFA for admin accounts
5. **Monitoring**: Set up CloudWatch alarms

## Next Steps After Deployment

1. **Custom Domain**: Set up your own domain name
2. **CI/CD**: Set up automatic deployments from Git
3. **Monitoring**: Configure detailed monitoring and alerts
4. **Backup**: Set up automated backups
5. **Scaling**: Configure auto-scaling for high traffic

Your Freehold Document Sharing Platform will be fully functional in the AWS cloud with:
- ✅ Secure authentication
- ✅ File upload/download
- ✅ Responsive web interface
- ✅ Scalable infrastructure
- ✅ Production-ready security