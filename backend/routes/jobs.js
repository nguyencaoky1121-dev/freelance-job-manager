const express = require('express');
const { JobScanner } = require('../services/jobScanner');
const { all, run, get } = require('../db/database');
const {
  acceptJob,
  startWork,
  submitDeliverable,
  requestPayment,
  confirmPayment,
  getJobWorkflow,
  getJobsByStatus,
  getEarningsSummary,
} = require('../services/jobWorkflow');

const router = express.Router();
const scanner = new JobScanner();

/**
 * GET /api/jobs - List all jobs
 */
router.get('/', async (req, res) => {
  try {
    const { status = null, platform = null, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM jobs';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    if (platform) {
      if (status) query += ' AND platform = ?';
      else query += ' WHERE platform = ?';
      params.push(platform);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const jobs = await all(query, params);

    // Parse JSON fields
    const parsed = jobs.map(job => ({
      ...job,
      skills: JSON.parse(job.skills || '[]'),
      analysis: JSON.parse(job.analysis || '{}'),
      solution: JSON.parse(job.solution || '{}'),
    }));

    res.json({ success: true, jobs: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/jobs/:id - Get single job
 */
router.get('/:id', async (req, res) => {
  try {
    const job = await get('SELECT * FROM jobs WHERE id = ?', [req.params.id]);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({
      success: true,
      job: {
        ...job,
        skills: JSON.parse(job.skills || '[]'),
        analysis: JSON.parse(job.analysis || '{}'),
        solution: JSON.parse(job.solution || '{}'),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/jobs/scan - Trigger job scan
 */
router.post('/scan', async (req, res) => {
  try {
    const { keywords } = req.body;
    const result = await scanner.scanJobs(keywords);

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/jobs/:id/approve - Approve job and set solution
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { solution } = req.body;
    const jobId = req.params.id;

    await run(
      'UPDATE jobs SET status = ?, solution = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['APPROVED', JSON.stringify(solution || {}), jobId]
    );

    if (global.broadcast) {
      global.broadcast({
        type: 'JOB_APPROVED',
        job_id: jobId,
        solution,
      });
    }

    res.json({ success: true, message: 'Job approved' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/jobs/:id/submit - Submit deliverable
 */
router.post('/:id/submit', async (req, res) => {
  try {
    const { deliverable_url, deliverable_description } = req.body;
    const jobId = req.params.id;

    const job = await get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // TODO: Use Freelancer API to submit deliverable
    // await freelancerAPI.submitDeliverable(job.external_id, deliverable_url);

    await run(
      'UPDATE jobs SET status = ?, deliverable_url = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['SUBMITTED', deliverable_url || '', jobId]
    );

    if (global.broadcast) {
      global.broadcast({
        type: 'JOB_SUBMITTED',
        job_id: jobId,
        deliverable_url,
      });
    }

    res.json({ success: true, message: 'Deliverable submitted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/jobs/:id/complete - Mark job as completed and paid
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { earnings, paymentMethod = 'PayPal' } = req.body;
    const jobId = req.params.id;

    await run(
      'UPDATE jobs SET status = ?, completed_at = CURRENT_TIMESTAMP, earnings = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['COMPLETED', earnings || 0, jobId]
    );

    if (global.broadcast) {
      global.broadcast({
        type: 'JOB_COMPLETED',
        job_id: jobId,
        earnings,
        paymentMethod,
      });
    }

    res.json({ success: true, message: 'Job marked as completed', earnings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/jobs/scanner/status - Get scanner status
 */
router.get('/scanner/status', (req, res) => {
  res.json(scanner.getStatus());
});

/**
 * POST /api/jobs/:id/accept - Accept job
 */
router.post('/:id/accept', async (req, res) => {
  try {
    const result = await acceptJob(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/jobs/:id/start-work - Start work and generate design
 */
router.post('/:id/start-work', async (req, res) => {
  try {
    const result = await startWork(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/jobs/:id/submit-deliverable - Submit deliverable
 */
router.post('/:id/submit-deliverable', async (req, res) => {
  try {
    const { deliverable_url, description } = req.body;
    const result = await submitDeliverable(req.params.id, deliverable_url, description);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/jobs/:id/request-payment - Request payment
 */
router.post('/:id/request-payment', async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const result = await requestPayment(req.params.id, amount, paymentMethod);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/jobs/:id/confirm-payment - Confirm payment received
 */
router.post('/:id/confirm-payment', async (req, res) => {
  try {
    const { amount, transactionId } = req.body;
    const result = await confirmPayment(req.params.id, amount, transactionId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/jobs/:id/workflow - Get job workflow status
 */
router.get('/:id/workflow', async (req, res) => {
  try {
    const result = await getJobWorkflow(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/jobs/status/:status - Get jobs by status
 */
router.get('/status/:status', async (req, res) => {
  try {
    const result = await getJobsByStatus(req.params.status);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/jobs/earnings/summary - Get earnings summary
 */
router.get('/earnings/summary', async (req, res) => {
  try {
    const result = await getEarningsSummary();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
