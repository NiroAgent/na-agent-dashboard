#!/usr/bin/env node
/**
 * Production startup script for TypeScript Agent Dashboard API
 * Runs the compiled TypeScript application
 */

// Check if built files exist
const path = require('path');
const fs = require('fs');

const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.js');

if (!fs.existsSync(indexPath)) {
  console.error('❌ Built files not found. Please run "npm run build" first.');
  process.exit(1);
}

console.log('🚀 Starting Agent Dashboard API from TypeScript build...');
require('./dist/index.js');