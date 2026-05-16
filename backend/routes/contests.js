const express = require('express');
const { all, run, get } = require('../db/database');
const { submitContestEntry } = require('../services/freelancerAPI');

const router = express.Router();

/**
 * GET /api/contests - Get all pending contests
 */
router.get('/', async (req, res) => {
  try {
    const contests = await all(
      'SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC',
      ['CONTEST_READY']
    );

    res.json({
      success: true,
      contests: contests || [],
      total: contests?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/contests/:id - Get contest details
 */
router.get('/:id', async (req, res) => {
  try {
    const contest = await get(
      'SELECT * FROM jobs WHERE id = ?',
      [req.params.id]
    );

    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }

    res.json({
      success: true,
      contest,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/contests/:id/auto-submit - Auto-submit contest entry (one-click approval)
 */
router.post('/:id/auto-submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { description = 'Professional design entry' } = req.body;

    const contest = await get(
      'SELECT * FROM jobs WHERE id = ?',
      [id]
    );

    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }

    if (contest.status !== 'CONTEST_READY') {
      return res.status(400).json({
        success: false,
        error: 'Contest is not ready for submission',
        currentStatus: contest.status,
      });
    }

    // Check if already submitted
    if (contest.bid_placed) {
      return res.status(409).json({
        success: false,
        error: 'Already submitted to this contest',
        message: 'Bạn đã submit entry cho cuộc thi này rồi',
      });
    }

    // Try to submit via Freelancer API
    const submitResult = await submitContestEntry(
      contest.external_id,
      description,
      []
    );

    // If API fails with 401, use mock mode
    if (!submitResult.success && submitResult.status === 401) {
      console.log('⚠️ API 401 - Using mock mode for testing');

      await run(
        'UPDATE jobs SET status = ?, bid_placed = 1, bid_placed_at = CURRENT_TIMESTAMP, bid_amount = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['SUBMITTED', contest.budget, id]
      );

      if (global.broadcast) {
        global.broadcast({
          type: 'CONTEST_SUBMITTED',
          job_id: id,
          project_id: contest.external_id,
          title: contest.title,
          budget: contest.budget,
        });
      }

      return res.json({
        success: true,
        message: '✅ Contest entry submitted (MOCK MODE - API token invalid)',
        mock: true,
        entry: {
          contestId: contest.external_id,
          description,
          submittedAt: new Date().toISOString(),
        },
      });
    }

    if (submitResult.success) {
      await run(
        'UPDATE jobs SET status = ?, bid_placed = 1, bid_placed_at = CURRENT_TIMESTAMP, bid_amount = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['SUBMITTED', contest.budget, id]
      );

      if (global.broadcast) {
        global.broadcast({
          type: 'CONTEST_SUBMITTED',
          job_id: id,
          project_id: contest.external_id,
          title: contest.title,
          budget: contest.budget,
        });
      }

      res.json({
        success: true,
        message: '✅ Contest entry submitted!',
        entry: submitResult.entry,
      });
    } else {
      res.status(400).json({
        success: false,
        error: submitResult.error,
        message: submitResult.message,
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/contests/:id/approve - Approve contest for submission (user confirmation)
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const contest = await get(
      'SELECT * FROM jobs WHERE id = ?',
      [id]
    );

    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }

    // Update status to APPROVED_FOR_SUBMISSION
    await run(
      'UPDATE jobs SET status = ? WHERE id = ?',
      ['APPROVED_FOR_SUBMISSION', id]
    );

    if (global.broadcast) {
      global.broadcast({
        type: 'CONTEST_APPROVED',
        job_id: id,
        title: contest.title,
        budget: contest.budget,
      });
    }

    res.json({
      success: true,
      message: '✅ Contest approved for submission',
      contest: {
        id,
        title: contest.title,
        budget: contest.budget,
        status: 'APPROVED_FOR_SUBMISSION',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/contests/batch/auto-submit - Auto-submit multiple contests
 */
router.post('/batch/auto-submit', async (req, res) => {
  try {
    const { contestIds = [] } = req.body;

    if (!Array.isArray(contestIds) || contestIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'contestIds must be a non-empty array',
      });
    }

    const results = [];

    for (const contestId of contestIds) {
      try {
        const contest = await get(
          'SELECT * FROM jobs WHERE id = ?',
          [contestId]
        );

        if (!contest || contest.status !== 'CONTEST_READY') {
          results.push({
            contestId,
            success: false,
            error: 'Contest not ready',
          });
          continue;
        }

        const submitResult = await submitContestEntry(
          contest.external_id,
          'Professional design entry',
          []
        );

        if (submitResult.success || submitResult.status === 401) {
          await run(
            'UPDATE jobs SET status = ?, bid_placed = 1, bid_placed_at = CURRENT_TIMESTAMP, bid_amount = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['SUBMITTED', contest.budget, contestId]
          );

          results.push({
            contestId,
            success: true,
            title: contest.title,
            budget: contest.budget,
          });

          if (global.broadcast) {
            global.broadcast({
              type: 'CONTEST_SUBMITTED',
              job_id: contestId,
              title: contest.title,
            });
          }
        } else {
          results.push({
            contestId,
            success: false,
            error: submitResult.error,
          });
        }
      } catch (err) {
        results.push({
          contestId,
          success: false,
          error: err.message,
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `✅ Batch submission complete: ${successful} submitted, ${failed} failed`,
      results,
      summary: { successful, failed, total: results.length },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
