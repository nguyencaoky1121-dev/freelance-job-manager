const express = require('express');
const { all, run, get } = require('../db/database');
const { GitHubAPI } = require('../services/githubAPI');

const router = express.Router();
const githubAPI = new GitHubAPI();

// Base URL for internal API calls
const API_BASE = process.env.API_BASE || `http://localhost:${process.env.PORT || 3000}/api`;

/**
 * GET /api/github - Get all pending GitHub bounties
 */
router.get('/', async (req, res) => {
  try {
    const bounties = await all(
      'SELECT * FROM jobs WHERE platform IN (?, ?, ?) AND status IN (?, ?) ORDER BY created_at DESC',
      ['github', 'gitcoin', 'algora', 'SCANNED', 'ANALYZED']
    );

    res.json({
      success: true,
      bounties: bounties || [],
      total: bounties?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/github/:id - Get bounty details
 */
router.get('/:id', async (req, res) => {
  try {
    const bounty = await get(
      'SELECT * FROM jobs WHERE id = ?',
      [req.params.id]
    );

    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    res.json({
      success: true,
      bounty,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/github/:id/auto-submit - Auto-submit to GitHub bounty
 */
router.post('/:id/auto-submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment = null } = req.body;

    const bounty = await get(
      'SELECT * FROM jobs WHERE id = ?',
      [id]
    );

    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    if (!['github', 'gitcoin', 'algora'].includes(bounty.platform)) {
      return res.status(400).json({
        success: false,
        error: 'Chỉ hỗ trợ auto-submit cho GitHub, Gitcoin và Algora bounties',
      });
    }

    if (bounty.bid_placed) {
      return res.status(409).json({
        success: false,
        error: 'Already submitted to this bounty',
        message: 'Bạn đã submit cho bounty này rồi',
      });
    }

    if (!['github', 'gitcoin', 'algora'].includes(bounty.platform)) {
      return res.status(400).json({
        success: false,
        error: 'Chỉ hỗ trợ auto-submit cho GitHub, Gitcoin và Algora bounties',
      });
    }

    if (bounty.bid_placed) {
      return res.status(409).json({
        success: false,
        error: 'Already submitted to this bounty',
        message: 'Bạn đã submit cho bounty này rồi',
      });
    }

    // Parse GitHub URL to get owner, repo, issue number
    const urlParts = bounty.project_url.split('/');
    const owner = urlParts[3];
    const repo = urlParts[4];
    const issueNumber = urlParts[6];

    // Thay thế bằng việc gọi pipeline autowork mới
    try {
      const autoworkRes = await fetch(`${API_BASE}/autowork/process/${bounty.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const autoworkData = await autoworkRes.json();

      if (autoworkData.success) {
        res.json({
          success: true,
          message: '✅ Bounty submission posted via Autowork pipeline!',
          prUrl: autoworkData.prUrl,
        });
      } else {
        res.status(400).json({
          success: false,
          error: autoworkData.error || 'Autowork pipeline failed',
          message: 'Failed to submit bounty via Autowork pipeline',
        });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/github/:id/approve - Approve bounty for submission
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const bounty = await get(
      'SELECT * FROM jobs WHERE id = ?',
      [id]
    );

    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    // Update status to ANALYZED (ready for submission)
    await run(
      'UPDATE jobs SET status = ? WHERE id = ?',
      ['ANALYZED', id]
    );

    if (global.broadcast) {
      global.broadcast({
        type: 'GITHUB_BOUNTY_APPROVED',
        job_id: id,
        title: bounty.title,
        budget: bounty.budget,
      });
    }

    res.json({
      success: true,
      message: '✅ Bounty approved for submission',
      bounty: {
        id,
        title: bounty.title,
        budget: bounty.budget,
        status: 'ANALYZED',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/github/batch/auto-submit - Batch submit to multiple bounties
 */
router.post('/batch/auto-submit', async (req, res) => {
  try {
    const { bountyIds = [] } = req.body;

    if (!Array.isArray(bountyIds) || bountyIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'bountyIds must be a non-empty array',
      });
    }

    const results = [];

    for (const bountyId of bountyIds) {
      try {
        const bounty = await get(
          'SELECT * FROM jobs WHERE id = ?',
          [bountyId]
        );

        if (!bounty || !['github', 'gitcoin', 'algora'].includes(bounty.platform) || bounty.status === 'SUBMITTED') {
          results.push({
            bountyId,
            success: false,
            error: 'Bounty not ready or already submitted',
          });
          continue;
        }

        // Parse GitHub URL
        const urlParts = bounty.project_url.split('/');
        const owner = urlParts[3];
        const repo = urlParts[4];
        const issueNumber = urlParts[6];

        const githubUsername = process.env.GITHUB_USERNAME || 'freelancer';
        const submitComment = `Hi! I'm interested in working on this bounty. I'm a designer/developer with experience in UI/UX, frontend development, and web design.

You can check out my work here: https://github.com/${githubUsername}

I'd love to discuss the requirements and timeline. Looking forward to hearing from you!`;

        const submitResult = await githubAPI.postComment(owner, repo, issueNumber, submitComment);

        if (submitResult.success) {
          await run(
            'UPDATE jobs SET status = ?, bid_placed = 1, bid_placed_at = CURRENT_TIMESTAMP, bid_amount = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['SUBMITTED', bounty.budget, bountyId]
          );

          results.push({
            bountyId,
            success: true,
            title: bounty.title,
            budget: bounty.budget,
          });

          if (global.broadcast) {
            global.broadcast({
              type: 'GITHUB_BOUNTY_SUBMITTED',
              job_id: bountyId,
              title: bounty.title,
            });
          }
        } else {
          results.push({
            bountyId,
            success: false,
            error: submitResult.error,
          });
        }
      } catch (err) {
        results.push({
          bountyId,
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

/**
 * GET /api/github/submissions - Get all submitted bounties with tracking status
 */
router.get('/submissions/all', async (req, res) => {
  try {
    const submissions = await all(
      `SELECT j.*, p.payment_status, p.bounty_amount as tracked_amount
       FROM jobs j
       LEFT JOIN payment_history p ON j.id = p.job_id
       WHERE j.platform IN ('github', 'gitcoin', 'algora')
       AND j.bid_placed = 1
       ORDER BY j.submitted_at DESC`
    );

    const summary = await get(
      `SELECT
        COUNT(*) as total_submitted,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END) as pending,
        SUM(budget) as total_potential_earnings
       FROM jobs
       WHERE platform IN ('github', 'gitcoin', 'algora')
       AND bid_placed = 1`
    );

    res.json({
      success: true,
      submissions: submissions || [],
      summary: summary || {},
      total: submissions?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
