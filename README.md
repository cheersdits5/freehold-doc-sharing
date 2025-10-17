# Freehold Document Sharing Platform

A secure web-based document sharing platform for freehold community members. The system allows authenticated users to upload, store, and access shared documents through a web interface, with all files securely stored in AWS S3.

## Project Structure

```
freehold-document-sharing/
├── frontend/          # React frontend application
├── backend/           # Node.js/Express backend API
├── package.json       # Root package.json for monorepo
└── README.md
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL database
- AWS S3 bucket

## Setup Instructions

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all workspace dependencies
npm install --workspaces
```

### 2. Environment Configuration

#### Backend Environment
Copy `backend/.env.example` to `backend/.env` and configure:

```bash
cp backend/.env.example backend/.env
```

Update the following variables in `backend/.env`:
- Database connection details
- JWT secrets
- AWS S3 configuration
- Other security settings

#### Frontend Environment
Copy `frontend/.env.example` to `frontend/.env` and configure:

```bash
cp frontend/.env.example frontend/.env
```

### 3. Database Setup

Create a PostgreSQL database and update the connection details in `backend/.env`.

### 4. Development

Start both frontend and backend in development mode:

```bash
npm run dev
```

Or start them individually:

```bash
# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend
```

### 5. Building

Build both applications:

```bash
npm run build
```

### 6. Testing

Run tests for both applications:

```bash
npm run test
```

### 7. Linting

Run linting for both applications:

```bash
npm run lint
```

## Technology Stack

### Frontend
- React 18 with TypeScript
- Material-UI for components
- Vite for build tooling
- React Router for navigation
- Axios for API communication

### Backend
- Node.js with Express.js
- TypeScript
- PostgreSQL database
- AWS S3 for file storage
- JWT for authentication
- Jest for testing

## Development Workflow

1. The project uses a monorepo structure with npm workspaces
2. Both frontend and backend are TypeScript-first
3. Environment variables are used for configuration
4. ESLint is configured for code quality
5. Jest/Vitest for testing

## Next Steps

After setting up the project structure, the next tasks involve:
1. Implementing database schema and models
2. Setting up authentication system
3. Creating AWS S3 integration
4. Building API endpoints
5. Developing React frontend components

Refer to the implementation plan in `.kiro/specs/freehold-document-sharing/tasks.md` for detailed task breakdown.