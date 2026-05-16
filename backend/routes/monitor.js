const express = require('express');
const { JobMonitor } = require('../services/jobMonitor');

const router = express.Router();
const monitor = new JobMonitor();

// Make monitor globally accessible
global.jobMonitor = monitor;

/**
 * GET /api/monitor/status - Get monitoring status
 */
router.get('/status', (req, res) => {
  const status = monitor.getStatus();
  res.json({
    success: true,
    ...status,
  });
});

/**
 * POST /api/monitor/check-messages - Manually check for new messages
 */
router.post('/check-messages', async (req, res) => {
  try {
    const result = await monitor.checkNewMessages();
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/monitor/check-awards - Manually check for job awards
 */
router.post('/check-awards', async (req, res) => {
  try {
    const result = await monitor.checkJobAwards();
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/monitor/run-cycle - Manually run full monitoring cycle
 */
router.post('/run-cycle', async (req, res) => {
  try {
    await monitor.runMonitoringCycle();
    res.json({
      success: true,
      message: 'Monitoring cycle completed',
      status: monitor.getStatus(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/monitor/start - Start auto-monitoring
 */
router.post('/start', (req, res) => {
  const { interval = 120000 } = req.body;
  monitor.startAutoMonitoring(interval);
  res.json({
    success: true,
    message: `Auto-monitoring started (interval: ${interval}ms)`,
  });
});

/**
 * POST /api/monitor/stop - Stop auto-monitoring
 */
router.post('/stop', (req, res) => {
  monitor.stopAutoMonitoring();
  res.json({
    success: true,
    message: 'Auto-monitoring stopped',
  });
});

module.exports = { router, monitor };
