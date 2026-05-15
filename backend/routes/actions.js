const express = require('express');
const { all, run, get } = require('../db/database');
const {
  placeBid,
  sendMessage,
  submitDeliverable,
  requestMilestone,
} = require('../services/freelancerAPI');

const router = express.Router();

/**
 * POST /api/actions/send-proposal - Send proposal (bid) to project
 */
router.post('/send-proposal', async (req, res) => {
  try {
    const { jobId, projectId, amount, period = 7, proposal } = req.body;

    if (!projectId || !amount || !proposal) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: projectId, amount, proposal',
      });
    }

    // Send bid via Freelancer API
    const bidResult = await placeBid(projectId, amount, period, proposal);

    if (bidResult.success) {
      // Update job status
      await run(
        'UPDATE jobs SET status = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['APPROVED', jobId]
      );

      if (global.broadcast) {
        global.broadcast({
          type: 'PROPOSAL_SENT',
          job_id: jobId,
          project_id: projectId,
          amount: amount,
        });
      }

      res.json({
        success: true,
        message: '✅ Proposal sent to client!',
        bid: bidResult.bid,
      });
    } else {
      res.status(400).json({
        success: false,
        error: bidResult.error,
        message: bidResult.status,
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/actions/send-message - Send message to client
 */
router.post('/send-message', async (req, res) => {
  try {
    const { jobId, threadId, message } = req.body;

    if (!threadId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: threadId, message',
      });
    }

    // Send message via Freelancer API
    const msgResult = await sendMessage(threadId, message);

    if (msgResult.success) {
      // Update message status in DB
      await run(
        'UPDATE messages SET reply_status = ?, replied_at = CURRENT_TIMESTAMP WHERE job_id = ? AND reply_status = ?',
        ['sent', jobId, 'pending']
      );

      if (global.broadcast) {
        global.broadcast({
          type: 'MESSAGE_SENT',
          job_id: jobId,
          thread_id: threadId,
        });
      }

      res.json({
        success: true,
        message: '✅ Message sent to client!',
      });
    } else {
      res.status(400).json({
        success: false,
        error: msgResult.error,
        message: msgResult.status,
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/actions/submit-deliverable - Submit deliverable
 */
router.post('/submit-deliverable', async (req, res) => {
  try {
    const { jobId, projectId, bidId, deliverableUrl, description } = req.body;

    if (!projectId || !bidId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: projectId, bidId',
      });
    }

    // Submit deliverable via Freelancer API
    const delivResult = await submitDeliverable(
      projectId,
      bidId,
      deliverableUrl ? [{ url: deliverableUrl }] : [],
      description || 'Design deliverable - ready for review'
    );

    if (delivResult.success) {
      // Update job status
      await run(
        'UPDATE jobs SET status = ?, deliverable_url = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['SUBMITTED', deliverableUrl || '', jobId]
      );

      if (global.broadcast) {
        global.broadcast({
          type: 'DELIVERABLE_SUBMITTED',
          job_id: jobId,
          project_id: projectId,
        });
      }

      res.json({
        success: true,
        message: '✅ Deliverable submitted!',
        deliverable: delivResult.deliverable,
      });
    } else {
      res.status(400).json({
        success: false,
        error: delivResult.error,
        message: delivResult.status,
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/actions/request-payment - Request milestone payment
 */
router.post('/request-payment', async (req, res) => {
  try {
    const { jobId, projectId, bidId, amount } = req.body;

    if (!projectId || !bidId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: projectId, bidId, amount',
      });
    }

    // Request milestone via Freelancer API
    const paymentResult = await requestMilestone(
      projectId,
      bidId,
      amount,
      'Payment for completed design work'
    );

    if (paymentResult.success) {
      // Update job status
      await run(
        'UPDATE jobs SET status = ? WHERE id = ?',
        ['PAYMENT_REQUESTED', jobId]
      );

      if (global.broadcast) {
        global.broadcast({
          type: 'PAYMENT_REQUESTED',
          job_id: jobId,
          project_id: projectId,
          amount: amount,
        });
      }

      res.json({
        success: true,
        message: `✅ Payment request sent! ($${amount})`,
        milestone: paymentResult.milestone,
      });
    } else {
      res.status(400).json({
        success: false,
        error: paymentResult.error,
        message: paymentResult.status,
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
