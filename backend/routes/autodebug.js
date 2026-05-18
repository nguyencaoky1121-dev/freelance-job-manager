const express = require('express');
const { all, get } = require('../db/database');
const { autoDebugRunner } = require('../services/autoDebugRunner');

const router = express.Router();

/**
 * GET /api/autodebug/status - Get auto-debug status
 */
router.get('/status', (req, res) => {
  try {
    const status = autoDebugRunner.getStatus();
    res.json({
      success: true,
      ...status,
      railwayConfigured: !!(process.env.RAILWAY_API_TOKEN && process.env.RAILWAY_PROJECT_ID),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/autodebug/start - Start auto-debug loop
 */
router.post('/start', async (req, res) => {
  try {
    const {
      projectId = process.env.RAILWAY_PROJECT_ID || 'demo-project',
      serviceId = process.env.RAILWAY_SERVICE_ID || 'demo-service',
      maxCycles = 5,
      pollingDelay = 60000,
      autoFix = true,
    } = req.body;

    const result = await autoDebugRunner.start(projectId, serviceId, {
      maxCycles,
      pollingDelay,
      autoFix,
    });

    // Broadcast start event
    if (global.broadcast) {
      global.broadcast({
        type: 'AUTO_DEBUG_STARTED',
        projectId,
        serviceId,
        maxCycles,
      });
    }

    res.json({
      success: true,
      message: '🔧 Auto-debug started',
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/autodebug/stop - Stop auto-debug loop
 */
router.post('/stop', (req, res) => {
  try {
    const result = autoDebugRunner.stop();

    // Broadcast stop event
    if (global.broadcast) {
      global.broadcast({
        type: 'AUTO_DEBUG_STOPPED',
        ...result,
      });
    }

    res.json({
      success: true,
      message: '🛑 Auto-debug stopped',
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/autodebug/trigger - Trigger immediate debug cycle
 */
router.post('/trigger', async (req, res) => {
  try {
    const result = await autoDebugRunner.triggerNow();
    res.json({
      success: true,
      message: '⚡ Debug cycle triggered',
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/autodebug/history - Get debug history
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await autoDebugRunner.getHistory(limit);
    res.json({
      success: true,
      history,
      total: history.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/autodebug/config - Update auto-debug configuration
 */
router.put('/config', (req, res) => {
  try {
    const result = autoDebugRunner.updateConfig(req.body);
    res.json({
      success: true,
      message: '⚙️ Configuration updated',
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/autodebug/analyze-logs - Analyze logs without starting auto-debug
 */
router.post('/analyze-logs', async (req, res) => {
  try {
    const { RailwayLogAnalyzer } = require('../services/railwayLogAnalyzer');
    const analyzer = new RailwayLogAnalyzer();

    const projectId = req.body.projectId || process.env.RAILWAY_PROJECT_ID || 'demo';
    const serviceId = req.body.serviceId || process.env.RAILWAY_SERVICE_ID || 'demo';

    const logsResult = await analyzer.fetchRailwayLogs(projectId, serviceId);
    const { errors, warnings } = analyzer.analyzeLogs(logsResult.logs);
    const summary = analyzer.getErrorSummary(errors, warnings);
    const groups = analyzer.groupErrorsByType(errors);

    res.json({
      success: true,
      logsSource: logsResult.success ? 'railway' : 'mock',
      summary,
      errorGroups: groups,
      errors: errors.slice(0, 20),
      warnings: warnings.slice(0, 10),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;