#!/bin/bash

# Freelance Job Manager - Start Script

echo ""
echo "========================================"
echo "  Freelance Job Manager"
echo "  Kiếm Tiền Online Dashboard"
echo "========================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo ""
    echo "⚠️  Please edit .env and add your FREELANCER_OAUTH_TOKEN"
    echo ""
    read -p "Press Enter to continue..."
fi

# Start server
echo "Starting server..."
echo ""
echo "🚀 Dashboard: http://localhost:3000"
echo "📡 WebSocket: ws://localhost:3001"
echo ""
echo "Press Ctrl+C to stop"
echo ""

node backend/server.js
