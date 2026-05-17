const express = require('express');
const { all, run, get } = require('../db/database');
const { InternalAutoWorkPipeline } = require('../services/internalAutoWorkPipeline');

const router = express.Router();
const pipeline = new InternalAutoWorkPipeline();

/**
 * GET /api/autowork/status - Get auto-work pipeline status
 */
router.get('/status', (req, res) => {
  try {
    const status = pipeline.getStatus();
    res.json({
      success: true,
      ...status,
      internalPipelineActive: true,
      githubConfigured: !!process.env.GITHUB_TOKEN,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/autowork/process/:id - Process a single bounty through the pipeline
 */
router.post('/process/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const bounty = await get('SELECT * FROM jobs WHERE id = ?', [id]);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    // Start processing (async)
    const result = await pipeline.processSingleBounty(bounty);

    // Broadcast update
    if (global.broadcast) {
      global.broadcast({
        type: 'AUTOWORK_UPDATE',
        job_id: id,
        title: bounty.title,
        result,
      });
    }

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/autowork/process-all - Process all qualified bounties
 */
router.post('/process-all', async (req, res) => {
  try {
    // Get qualified bounties (budget > 0, not yet processed)
    const bounties = await all(
      `SELECT * FROM jobs
       WHERE platform IN ('github', 'gitcoin', 'algora')
       AND budget > 0
       AND status IN ('SCANNED', 'ANALYZED')
       AND (bid_placed IS NULL OR bid_placed = 0)
       ORDER BY budget DESC
       LIMIT 5`
    );

    if (bounties.length === 0) {
      return res.json({
        success: true,
        message: 'No qualified bounties to process',
        processed: 0,
      });
    }

    // Filter by score
    const qualified = bounties.filter(b => {
      try {
        const analysis = JSON.parse(b.analysis || '{}');
        return (analysis.score || 0) >= 40;
      } catch {
        return false;
      }
    });

    // Process in parallel
    const result = await pipeline.processMultipleBounties(qualified);

    // Broadcast
    if (global.broadcast) {
      global.broadcast({
        type: 'AUTOWORK_BATCH_STARTED',
        count: qualified.length,
      });
    }

    res.json({
      success: true,
      message: `Processing ${qualified.length} bounties`,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/autowork/analyze/:id - Only analyze a bounty (no execution)
 */
router.post('/analyze/:id', async (req, res) => {
  try {
    const bounty = await get('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }

    const decision = await pipeline.analyzeAndDecide(bounty);

    res.json({
      success: true,
      bountyId: bounty.id,
      title: bounty.title,
      budget: bounty.budget,
      ...decision,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/autowork/history - Get processing history
 */
router.get('/history', async (req, res) => {
  try {
    const processed = await all(
      `SELECT j.*, p.payment_status
       FROM jobs j
       LEFT JOIN payment_history p ON j.id = p.job_id
       WHERE j.platform IN ('github', 'gitcoin', 'algora')
       AND j.bid_placed = 1
       ORDER BY j.submitted_at DESC
       LIMIT 50`
    );

    const summary = {
      total: processed.length,
      completed: processed.filter(j => j.status === 'COMPLETED').length,
      inProgress: processed.filter(j => j.status === 'IN_PROGRESS').length,
      pending: processed.filter(j => j.status === 'SUBMITTED').length,
      totalEarnings: processed
        .filter(j => j.status === 'COMPLETED')
        .reduce((sum, j) => sum + (j.budget || 0), 0),
    };

    res.json({
      success: true,
      history: processed,
      summary,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
