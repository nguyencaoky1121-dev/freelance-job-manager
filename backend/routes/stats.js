const express = require('express');
const { all, get, run } = require('../db/database');

const router = express.Router();

/**
 * GET /api/stats - Get statistics
 */
router.get('/', async (req, res) => {
  try {
    const stats = await all(`
      SELECT
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_jobs,
        SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END) as submitted_jobs,
        SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved_jobs,
        SUM(CASE WHEN status = 'ANALYZED' THEN 1 ELSE 0 END) as analyzed_jobs,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN earnings ELSE 0 END), 0) as total_earnings,
        ROUND(AVG(CASE WHEN status = 'COMPLETED' THEN earnings ELSE NULL END), 2) as avg_earnings,
        MAX(paid_at) as last_payment
      FROM jobs
    `);

    const jobsByPlatform = await all(`
      SELECT platform, COUNT(*) as count, SUM(earnings) as earnings
      FROM jobs WHERE status = 'COMPLETED'
      GROUP BY platform
    `);

    const jobsByStatus = await all(`
      SELECT status, COUNT(*) as count
      FROM jobs
      GROUP BY status
    `);

    const jobsByCategory = await all(`
      SELECT json_extract(analysis, '$.categories[0]') as category, COUNT(*) as count
      FROM jobs WHERE analysis != '{}'
      GROUP BY category
      LIMIT 10
    `);

    res.json({
      success: true,
      summary: stats[0] || {},
      byPlatform: jobsByPlatform,
      byStatus: jobsByStatus,
      byCategory: jobsByCategory,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/stats/daily - Daily earnings
 */
router.get('/daily', async (req, res) => {
  try {
    const data = await all(`
      SELECT
        DATE(completed_at) as date,
        COUNT(*) as jobs,
        COALESCE(SUM(earnings), 0) as earnings
      FROM jobs WHERE status = 'COMPLETED' AND completed_at IS NOT NULL
      GROUP BY DATE(completed_at)
      ORDER BY date DESC
      LIMIT 30
    `);

    res.json({ success: true, daily: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
