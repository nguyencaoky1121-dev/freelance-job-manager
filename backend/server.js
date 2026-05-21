require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const { initDB } = require('./db/database');
const jobRoutes = require('./routes/jobs');
const freelancerRoutes = require('./routes/freelancer');
const messageRoutes = require('./routes/messages');
const statsRoutes = require('./routes/stats');
const actionsRoutes = require('./routes/actions');
const contestRoutes = require('./routes/contests');
const githubRoutes = require('./routes/github');
const paymentsRoutes = require('./routes/payments');
const cryptoRoutes = require('./routes/crypto');
const { router: monitorRoutes, monitor } = require('./routes/monitor');
const autoworkRoutes = require('./routes/autowork');
const autodebugRoutes = require('./routes/autodebug');
const { JobScanner } = require('./services/jobScanner');
const { JobMonitor } = require('./services/jobMonitor');
const { ScannerManager } = require('./services/scannerManager');

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.use('/api/jobs', jobRoutes);
app.use('/api/freelancer', freelancerRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/actions', actionsRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/autowork', autoworkRoutes);
app.use('/api/autodebug', autodebugRoutes);

// Serve frontend (for all routes not matched)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// WebSocket server for real-time updates
let wss;
try {
  wss = new WebSocket.Server({ port: WS_PORT });
  wss.on('connection', (ws) => {
    console.log('🔌 Dashboard connected via WebSocket');
    ws.on('close', () => {
      console.log('🔌 Dashboard disconnected');
    });
  });
} catch (err) {
  console.log(`⚠️ WebSocket port ${WS_PORT} in use, trying ${WS_PORT + 1}...`);
  wss = new WebSocket.Server({ port: parseInt(WS_PORT) + 1 });
  wss.on('connection', (ws) => {
    console.log('🔌 Dashboard connected via WebSocket');
    ws.on('close', () => {
      console.log('🔌 Dashboard disconnected');
    });
  });
}

// Broadcast to all connected clients
function broadcast(data) {
  if (wss && wss.clients) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}

// System logging with broadcast
function sysLog(message, type = 'SYSTEM_INFO') {
  console.log(`[${type}] ${message}`);
  broadcast({
    type,
    message,
    timestamp: new Date().toISOString()
  });
}

// Make broadcast and sysLog available globally
global.broadcast = broadcast;
global.sysLog = sysLog;

// Initialize database and start server
async function start() {
  try {
    await initDB();
    console.log('✅ Database initialized');

    app.listen(PORT, () => {
      sysLog(`🚀 Server running at http://localhost:${PORT}`);
      sysLog(`📡 WebSocket running at ws://localhost:${WS_PORT}`);
      sysLog(`💰 PayPal: ${process.env.PAYPAL_EMAIL || 'Not configured'}`);
    });

    // Start job scanner (auto-scan)
    const { InternalAutoWorkPipeline } = require('./services/internalAutoWorkPipeline');
    const autoworkPipeline = new InternalAutoWorkPipeline();
    global.autoworkPipeline = autoworkPipeline; // Export pipeline ra global để scannerManager có thể kiểm tra

    const scannerManager = new ScannerManager();
    const scanInterval = parseInt(process.env.SCAN_INTERVAL) || 60000;
    scannerManager.startScanning(scanInterval);
    sysLog(`🔍 Job scanner will run every ${scanInterval / 1000}s`);

    // Start job monitor (auto-check for messages and awards)
    const monitorInterval = parseInt(process.env.MONITOR_INTERVAL) || 120000;
    monitor.startAutoMonitoring(monitorInterval);
    sysLog(`📬 Job monitor will run every ${monitorInterval / 1000}s`);

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();

module.exports = { app, broadcast };
