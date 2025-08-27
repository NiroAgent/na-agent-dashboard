#!/bin/bash

# Install test dependencies for frontend automation testing
echo "Installing Frontend Automation Test Dependencies..."
echo "======================================================"

# Navigate to project root
cd "$(dirname "$0")/.."

# Install Puppeteer for browser automation
echo "📦 Installing Puppeteer (headless Chrome)..."
npm install --save-dev puppeteer

# Install additional testing utilities
echo "📦 Installing testing utilities..."
npm install --save-dev @types/puppeteer

echo ""
echo "✅ Dependencies installed successfully!"
echo ""
echo "Available test commands:"
echo "  node scripts/test-frontend-automation.js    # Run full frontend test suite"
echo "  npm run test:frontend                       # Same as above (if added to package.json)"
echo ""
echo "Test will check for:"
echo "  - Console errors and warnings"
echo "  - API connectivity (ports 7778, 7779)"  
echo "  - UI element loading"
echo "  - Network request failures"
echo "  - Responsive design"
echo "  - React error boundaries"
echo ""