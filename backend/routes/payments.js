const express = require('express');
const { all, run, get } = require('../db/database');

const router = express.Router();

/**
 * GET /api/payments - Get all payment history
 */
router.get('/', async (req, res) => {
  try {
    const payments = await all(
      `SELECT ph.*, j.title as job_title, j.budget, j.platform
       FROM payment_history ph
       LEFT JOIN jobs j ON ph.job_id = j.id
       ORDER BY ph.created_at DESC`
    );

    const summary = await get(
      `SELECT
        COUNT(*) as total_submissions,
        SUM(CASE WHEN payment_status = 'paid' THEN bounty_amount ELSE 0 END) as total_earned,
        SUM(CASE WHEN payment_status = 'pending' THEN bounty_amount ELSE 0 END) as pending_amount,
        COUNT(DISTINCT CASE WHEN payment_status = 'paid' THEN job_id END) as completed_jobs
       FROM payment_history`
    );

    res.json({
      success: true,
      payments: payments || [],
      summary: summary || {},
      total: payments?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/payments/qualified - Get qualified bounties (có tiền + phù hợp chuyên môn)
 */
router.get('/qualified', async (req, res) => {
  try {
    // Lọc bounty có tiền (budget > 0) và có score cao (phù hợp chuyên môn)
    const qualified = await all(
      `SELECT * FROM jobs
       WHERE platform IN ('github', 'gitcoin', 'algora')
       AND budget > 0
       AND status IN ('SCANNED', 'ANALYZED')
       AND (analysis LIKE '%"score"%' OR analysis LIKE '%score%')
       ORDER BY budget DESC, created_at DESC`
    );

    // Parse analysis JSON và lọc theo score
    const filtered = qualified.filter(job => {
      try {
        const analysis = JSON.parse(job.analysis || '{}');
        const score = analysis.score || 0;
        return score >= 40; // Chỉ hiển thị score >= 40
      } catch {
        return false;
      }
    });

    res.json({
      success: true,
      bounties: filtered,
      total: filtered.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/payments/track - Track a submission
 */
router.post('/track', async (req, res) => {
  try {
    const { job_id, bounty_title, bounty_amount, platform } = req.body;

    if (!job_id || !bounty_title || !bounty_amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: job_id, bounty_title, bounty_amount',
      });
    }

    // Check if already tracked
    const existing = await get(
      'SELECT id FROM payment_history WHERE job_id = ?',
      [job_id]
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Bounty already tracked',
      });
    }

    await run(
      `INSERT INTO payment_history (job_id, platform, bounty_title, bounty_amount, submission_date, payment_status)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 'pending')`,
      [job_id, platform || 'github', bounty_title, bounty_amount]
    );

    res.json({
      success: true,
      message: 'Bounty tracked successfully',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/payments/:id - Update payment status
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_date, payment_method, notes } = req.body;

    const payment = await get(
      'SELECT * FROM payment_history WHERE id = ?',
      [id]
    );

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    await run(
      `UPDATE payment_history
       SET payment_status = ?, payment_date = ?, payment_method = ?, notes = ?
       WHERE id = ?`,
      [payment_status || payment.payment_status, payment_date, payment_method, notes, id]
    );

    res.json({
      success: true,
      message: 'Payment updated successfully',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/payments/summary - Get payment summary
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await get(
      `SELECT
        COUNT(*) as total_submissions,
        SUM(CASE WHEN payment_status = 'paid' THEN bounty_amount ELSE 0 END) as total_earned,
        SUM(CASE WHEN payment_status = 'pending' THEN bounty_amount ELSE 0 END) as pending_amount,
        COUNT(DISTINCT CASE WHEN payment_status = 'paid' THEN job_id END) as completed_jobs,
        COUNT(DISTINCT CASE WHEN payment_status = 'pending' THEN job_id END) as pending_jobs
       FROM payment_history`
    );

    res.json({
      success: true,
      summary: summary || {},
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
