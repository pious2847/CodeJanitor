#!/usr/bin/env node
/**
 * Local API Server Startup Script
 * 
 * Starts the CodeJanitor Enterprise API server for local testing
 */

import * as fs from 'fs';
import * as path from 'path';
import { ApiServer, ServerConfig } from '../api/server';

// Load configuration
const configPath = path.join(__dirname, '../../config/local.json');
let config: any;

try {
  const configContent = fs.readFileSync(configPath, 'utf-8');
  config = JSON.parse(configContent);
} catch (error) {
  console.error('Failed to load configuration:', error);
  process.exit(1);
}

// Create server configuration
const serverConfig: ServerConfig = {
  port: config.api.port || 3000,
  host: config.api.host || 'localhost',
  apiVersion: config.api.version || 'v1',
  enableRateLimiting: config.api.enableRateLimiting ?? false,
  enableAuthentication: config.api.enableAuthentication ?? false,
  corsOrigins: config.api.corsOrigins || ['*'],
};

// Create and start server
const server = new ApiServer(serverConfig);

console.log('Starting CodeJanitor Enterprise API Server...');
console.log('Configuration:', JSON.stringify(serverConfig, null, 2));

server.start()
  .then(() => {
    console.log('\n✅ API Server started successfully!');
    console.log(`\n📡 Server running at: http://${serverConfig.host}:${serverConfig.port}`);
    console.log(`📚 API Version: ${serverConfig.apiVersion}`);
    console.log('\nAvailable endpoints:');
    console.log(`  GET  /api/${serverConfig.apiVersion}/health`);
    console.log(`  GET  /api/${serverConfig.apiVersion}/projects`);
    console.log(`  POST /api/${serverConfig.apiVersion}/projects`);
    console.log(`  GET  /api/${serverConfig.apiVersion}/teams`);
    console.log(`  POST /api/${serverConfig.apiVersion}/analysis/run`);
    console.log(`  GET  /api/${serverConfig.apiVersion}/reports`);
    console.log(`  GET  /api/${serverConfig.apiVersion}/policies`);
    console.log('\nPress Ctrl+C to stop the server\n');
  })
  .catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down server...');
  try {
    await server.stop();
    console.log('✅ Server stopped gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n\nShutting down server...');
  try {
    await server.stop();
    console.log('✅ Server stopped gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});
