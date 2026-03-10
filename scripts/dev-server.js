#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { watch } from 'fs';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for Framer
app.use(cors({
  origin: ['https://framer.com', 'https://*.framer.app', 'http://localhost:3000'],
  credentials: true
}));

// Serve static files from dist directory
app.use('/plugin', express.static(join(projectRoot, 'dist')));

// Serve framer.json
app.get('/framer.json', (req, res) => {
  res.sendFile(join(projectRoot, 'framer.json'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    plugin: 'seespan-data-sync',
    version: '1.0.0'
  });
});

// Plugin manifest endpoint
app.get('/manifest', (req, res) => {
  res.json({
    id: 'seespan-data-sync',
    title: 'SeeSpan Data Sync',
    description: 'Sync video data from SeeSpan API to Framer CMS',
    version: '1.0.0',
    entry: '/plugin/index.js',
    permissions: ['cms:read', 'cms:write', 'plugin:storage'],
    modes: ['configureManagedCollection', 'syncManagedCollection']
  });
});

// Development info endpoint
app.get('/dev-info', (req, res) => {
  res.json({
    development: true,
    hotReload: true,
    buildStatus: 'watching',
    lastBuild: new Date().toISOString(),
    endpoints: {
      plugin: '/plugin/index.js',
      manifest: '/manifest',
      health: '/health',
      framerConfig: '/framer.json'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(chalk.red('Server Error:'), err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path,
    available: ['/plugin', '/framer.json', '/health', '/manifest', '/dev-info']
  });
});

// File watcher for hot reloading
function setupFileWatcher() {
  const spinner = ora('Watching for file changes...').start();
  
  watch(join(projectRoot, 'src'), { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.ts')) {
      spinner.succeed(chalk.green(`File changed: ${filename}`));
      console.log(chalk.blue('Rebuilding plugin...'));
      
      // Trigger rebuild
      import('child_process').then(({ exec }) => {
        exec('npm run build', (error, stdout, stderr) => {
          if (error) {
            spinner.fail(chalk.red(`Build failed: ${error.message}`));
            console.error(chalk.red(stderr));
          } else {
            spinner.succeed(chalk.green('Plugin rebuilt successfully'));
            console.log(chalk.blue('Plugin ready for testing in Framer'));
          }
        });
      });
      
      spinner.start('Watching for file changes...');
    }
  });
}

// Start server
app.listen(PORT, () => {
  console.log(chalk.green('🚀 Development server started!'));
  console.log(chalk.blue(`📍 Server running at: http://localhost:${PORT}`));
  console.log(chalk.yellow('📋 Available endpoints:'));
  console.log(chalk.cyan(`   Plugin: http://localhost:${PORT}/plugin/index.js`));
  console.log(chalk.cyan(`   Manifest: http://localhost:${PORT}/manifest`));
  console.log(chalk.cyan(`   Health: http://localhost:${PORT}/health`));
  console.log(chalk.cyan(`   Dev Info: http://localhost:${PORT}/dev-info`));
  console.log(chalk.cyan(`   Framer Config: http://localhost:${PORT}/framer.json`));
  console.log('');
  console.log(chalk.magenta('🔧 To use in Framer:'));
  console.log(chalk.white('   1. Enable Developer Mode in Framer'));
  console.log(chalk.white('   2. Add plugin from: http://localhost:3001'));
  console.log(chalk.white('   3. Plugin will auto-reload on file changes'));
  console.log('');
  
  setupFileWatcher();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🛑 Shutting down development server...'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n🛑 Shutting down development server...'));
  process.exit(0);
}); 