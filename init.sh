#!/bin/bash
#
# init.sh - Environment setup script for Doc Review Tool
# Run this at the start of each session to verify environment and start services
#

set -e  # Exit on error

echo "🔧 Doc Review Tool - Environment Initialization"
echo "================================================"
echo ""

# Verify we're in the right directory
if [ ! -f "project_state.md" ]; then
    echo "❌ Error: Not in Doc Review Tool directory"
    exit 1
fi

echo "📍 Working directory: $(pwd)"
echo ""

# Check Node.js version
echo "🔍 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 20+"
    exit 1
fi
NODE_VERSION=$(node -v)
echo "✅ Node.js: $NODE_VERSION"
echo ""

# Frontend setup
echo "🎨 Frontend Setup"
echo "-----------------"
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
else
    echo "✅ Frontend dependencies already installed"
fi
echo ""

# Backend setup
echo "⚙️  Backend Setup"
echo "-----------------"
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install
    cd ..
else
    echo "✅ Backend dependencies already installed"
fi

# Check for backend .env
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Warning: backend/.env not found"
    echo "   Copy backend/.env.example to backend/.env and add your GEMINI_API_KEY"
else
    echo "✅ Backend .env file exists"
fi
echo ""

# Build check
echo "🔨 Build Check"
echo "--------------"
echo "Testing frontend build..."
cd frontend
if npm run build > /dev/null 2>&1; then
    echo "✅ Frontend builds successfully"
else
    echo "⚠️  Frontend build has errors (expected during initial setup)"
fi
cd ..
echo ""

# Start services option
echo "🚀 Starting Services"
echo "--------------------"
echo "Frontend dev server: cd frontend && npm run dev"
echo "Backend dev server:  cd backend && npm run dev"
echo ""
echo "Would you like to start the dev servers now? (y/N)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo "Starting backend server..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..

    echo "Starting frontend server..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..

    echo ""
    echo "✅ Services started!"
    echo "   Backend PID: $BACKEND_PID"
    echo "   Frontend PID: $FRONTEND_PID"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend: http://localhost:3001"
    echo ""
    echo "To stop: kill $BACKEND_PID $FRONTEND_PID"
else
    echo "Skipping service start. Run manually when ready."
fi

echo ""
echo "✅ Environment ready!"
echo "================================================"
