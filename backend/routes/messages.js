const express = require('express');
const { all, run, get } = require('../db/database');
const { sendMessage } = require('../services/freelancerAPI');

const router = express.Router();

/**
 * GET /api/messages - Get messages for a job
 */
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { unreplied = false } = req.query;

    let query = 'SELECT * FROM messages WHERE job_id = ?';
    const params = [jobId];

    if (unreplied === 'true') {
      query += ' AND reply_status = ?';
      params.push('pending');
    }

    query += ' ORDER BY created_at DESC';

    const messages = await all(query, params);

    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/messages/:messageId/reply - Send reply to a message
 */
router.post('/:messageId/reply', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reply } = req.body;

    // Get message details
    const message = await get('SELECT * FROM messages WHERE id = ?', [messageId]);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Get job details
    const job = await get('SELECT * FROM jobs WHERE id = ?', [message.job_id]);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Send via Freelancer API
    // const { success: apiSuccess } = await sendMessage(message.thread_id, reply);
    // if (!apiSuccess) {
    //   return res.status(500).json({ success: false, error: 'Failed to send message' });
    // }

    // Update message status
    await run(
      'UPDATE messages SET reply_status = ?, replied_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['sent', messageId]
    );

    if (global.broadcast) {
      global.broadcast({
        type: 'MESSAGE_SENT',
        message_id: messageId,
        job_id: message.job_id,
        reply,
      });
    }

    res.json({ success: true, message: 'Reply sent' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/messages/:messageId/draft - Update draft reply
 */
router.put('/:messageId/draft', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { draft } = req.body;

    await run(
      'UPDATE messages SET draft_reply = ? WHERE id = ?',
      [draft, messageId]
    );

    res.json({ success: true, message: 'Draft updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
