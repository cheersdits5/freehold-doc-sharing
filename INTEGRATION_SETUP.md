# Frontend-Backend Integration Setup

This document describes how the frontend and backend are connected and how to test the integration.

## Architecture Overview

```
Frontend (React + Vite)     Backend (Node.js + Express)
Port: 3000                  Port: 3001
┌─────────────────────┐    ┌─────────────────────┐
│                     │    │                     │
│  React App          │    │  Express Server     │
│  ├─ API Client      │────┤  ├─ Auth Routes     │
│  ├─ Auth Service    │    │  ├─ File Routes     │
│  ├─ File Service    │    │  ├─ Category Routes │
│  └─ Components      │    │  └─ Middleware      │
│                     │    │                     │
└─────────────────────┘    └─────────────────────┘
         │                           │
         └─── Vite Proxy ────────────┘
              /api -> localhost:3001
```

## Configuration Details

### 1. Frontend Configuration

**Vite Proxy Setup** (`frontend/vite.config.ts`):
```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      secure: false,
    },
  },
}
```

**API Client** (`frontend/src/utils/apiClient.ts`):
- Base URL: `/api` (uses Vite proxy)
- Automatic JWT token attachment
- Token refresh handling
- Error interceptors

**Environment Variables** (`frontend/.env`):
```
VITE_API_BASE_URL=/api
VITE_APP_NAME=Freehold Document Sharing
VITE_MAX_FILE_SIZE=52428800
```

### 2. Backend Configuration

**Server Setup** (`backend/src/index.ts`):
- Port: 3001
- CORS enabled for `http://localhost:3000`
- Security middleware (Helmet, rate limiting)
- API routes under `/api` prefix

**Environment Variables** (`backend/.env`):
```
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
# ... database, JWT, AWS S3 config
```

### 3. API Endpoints

All API endpoints are prefixed with `/api`:

**Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/validate` - Token validation
- `GET /api/auth/me` - Current user info

**File Management:**
- `GET /api/files` - List documents
- `POST /api/files/upload` - Upload file
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file

**Categories:**
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category

## How to Start the Application

### Option 1: Start Both Services Together
```bash
npm run dev
```
This starts both frontend (port 3000) and backend (port 3001) concurrently.

### Option 2: Start Services Separately
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend  
npm run dev:frontend
```

### Option 3: Manual Start
```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

## Testing the Integration

### 1. Verify Setup
```bash
npm run verify-setup
```
This checks that all configuration files are properly set up.

### 2. Test Connection (Backend must be running)
```bash
npm run test-connection
```
This tests:
- Backend health endpoint
- API endpoint responses
- CORS configuration
- Security headers

### 3. Run Integration Tests (Backend must be running)
```bash
npm run test:integration
```

### 4. Run E2E Workflow Tests (Backend must be running)
```bash
npm run test:e2e
```

## Manual Testing Steps

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Verify backend is running:**
   - Visit: http://localhost:3001/health
   - Should return: `{"status":"healthy","timestamp":"...","version":"1.0.0"}`

3. **Verify frontend is running:**
   - Visit: http://localhost:3000
   - Should show the login page

4. **Test API proxy:**
   - Open browser dev tools
   - Try to login (will fail but should reach backend)
   - Check Network tab for requests to `/api/auth/login`
   - Should see 401 responses (authentication working)

## Authentication Flow

1. User enters credentials on login page
2. Frontend sends POST to `/api/auth/login` (proxied to backend:3001)
3. Backend validates credentials and returns JWT token
4. Frontend stores token and includes in subsequent requests
5. Backend validates token on protected routes

## File Upload Flow

1. User selects file in upload component
2. Frontend validates file type and size
3. Frontend sends multipart POST to `/api/files/upload`
4. Backend processes file, uploads to S3, stores metadata
5. Frontend receives upload confirmation

## Error Handling

- **Network errors**: Handled by API client interceptors
- **Authentication errors**: Automatic token refresh attempted
- **Validation errors**: Displayed to user with friendly messages
- **Server errors**: Logged and user-friendly message shown

## Troubleshooting

### Common Issues

1. **CORS errors:**
   - Check backend CORS_ORIGIN environment variable
   - Ensure frontend is running on port 3000

2. **API calls failing:**
   - Verify backend is running on port 3001
   - Check Vite proxy configuration
   - Ensure API client base URL is `/api`

3. **Authentication not working:**
   - Check JWT_SECRET in backend .env
   - Verify token storage in browser
   - Check API client token interceptors

### Debug Steps

1. Check both services are running:
   ```bash
   # Should show both processes
   netstat -an | findstr "3000\|3001"
   ```

2. Test backend directly:
   ```bash
   curl http://localhost:3001/health
   ```

3. Test frontend proxy:
   ```bash
   curl http://localhost:3000/api/auth/validate
   ```

4. Check browser network tab for API calls

## Security Considerations

- All API calls use HTTPS in production
- JWT tokens stored securely (httpOnly cookies recommended)
- CORS properly configured for allowed origins
- Rate limiting on authentication endpoints
- File upload validation and size limits
- S3 pre-signed URLs for secure file access

## Production Deployment

For production deployment:

1. Update environment variables for production URLs
2. Configure reverse proxy (nginx) instead of Vite proxy
3. Use HTTPS for all communications
4. Set secure CORS origins
5. Use production database and S3 bucket
6. Enable proper logging and monitoring