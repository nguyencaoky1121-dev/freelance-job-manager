const { run, get, all } = require('../db/database');
const { generateDesign } = require('./designGenerator');
const { sendMessage } = require('./freelancerAPI');

/**
 * Accept a job - move from ANALYZED to ACCEPTED
 */
async function acceptJob(jobId) {
  try {
    const job = await get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    if (!job) return { success: false, error: 'Job not found' };

    await run(
      'UPDATE jobs SET status = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['ACCEPTED', jobId]
    );

    // Send acceptance message to client
    const acceptanceMsg = `Thank you for choosing me! I'm excited to work on your project. I'll start right away and keep you updated on progress.`;

    if (global.broadcast) {
      global.broadcast({
        type: 'JOB_ACCEPTED',
        job_id: jobId,
        job_title: job.title,
      });
    }

    return { success: true, message: 'Job accepted' };
  } catch (err) {
    console.error('❌ Error accepting job:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Start work on job - generate design automatically
 */
async function startWork(jobId) {
  try {
    const job = await get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    if (!job) return { success: false, error: 'Job not found' };

    // Parse analysis
    const analysis = JSON.parse(job.analysis || '{}');
    const category = (analysis.categories || ['general_design'])[0];

    // Generate design
    const designResult = await generateDesign(jobId, category, {
      colors: ['#667eea', '#764ba2'],
      style: analysis.complexity,
    });

    if (!designResult.success) {
      return { success: false, error: 'Failed to generate design' };
    }

    // Update job status
    await run(
      'UPDATE jobs SET status = ?, solution = ? WHERE id = ?',
      [
        'IN_PROGRESS',
        JSON.stringify({
          design_url: designResult.designUrl,
          category: category,
          generated_at: new Date().toISOString(),
        }),
        jobId,
      ]
    );

    // Send progress update to client
    const progressMsg = `I've started working on your design! I'll have the first draft ready for you soon. Stay tuned!`;

    if (global.broadcast) {
      global.broadcast({
        type: 'JOB_IN_PROGRESS',
        job_id: jobId,
        design_url: designResult.designUrl,
      });
    }

    return {
      success: true,
      message: 'Work started',
      design: designResult,
    };
  } catch (err) {
    console.error('❌ Error starting work:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Submit deliverable and request payment
 */
async function submitDeliverable(jobId, deliverableUrl, description = '') {
  try {
    const job = await get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    if (!job) return { success: false, error: 'Job not found' };

    // Update job status
    await run(
      'UPDATE jobs SET status = ?, deliverable_url = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['SUBMITTED', deliverableUrl, jobId]
    );

    // Send deliverable message to client
    const deliveryMsg = `I've completed your design and uploaded it for your review!

📁 Deliverable: ${deliverableUrl}

${description ? `📝 Details: ${description}` : ''}

Please review and let me know if you'd like any revisions. Once you're satisfied, please release the payment so we can complete the project.

Thank you!`;

    // Send message via API
    // await sendMessage(job.thread_id, deliveryMsg);

    if (global.broadcast) {
      global.broadcast({
        type: 'DELIVERABLE_SUBMITTED',
        job_id: jobId,
        deliverable_url: deliverableUrl,
      });
    }

    return {
      success: true,
      message: 'Deliverable submitted',
      deliveryMessage: deliveryMsg,
    };
  } catch (err) {
    console.error('❌ Error submitting deliverable:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Request payment from client
 */
async function requestPayment(jobId, amount, paymentMethod = 'PayPal') {
  try {
    const job = await get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    if (!job) return { success: false, error: 'Job not found' };

    // Create payment request message
    const paymentMsg = `Great! I'm ready to finalize the project.

💰 Payment Details:
- Amount: $${amount}
- Method: ${paymentMethod}
- PayPal: ${process.env.PAYPAL_EMAIL || 'datmasuto1993@gmail.com'}

Please release the milestone payment to complete the project. Thank you for the opportunity to work with you!`;

    // Update job with payment request
    await run(
      'UPDATE jobs SET status = ? WHERE id = ?',
      ['PAYMENT_REQUESTED', jobId]
    );

    if (global.broadcast) {
      global.broadcast({
        type: 'PAYMENT_REQUESTED',
        job_id: jobId,
        amount: amount,
        paymentMethod: paymentMethod,
      });
    }

    return {
      success: true,
      message: 'Payment requested',
      paymentMessage: paymentMsg,
      amount: amount,
    };
  } catch (err) {
    console.error('❌ Error requesting payment:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Confirm payment received
 */
async function confirmPayment(jobId, amount, transactionId = '') {
  try {
    const job = await get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    if (!job) return { success: false, error: 'Job not found' };

    // Update job status
    await run(
      'UPDATE jobs SET status = ?, earnings = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['COMPLETED', amount, jobId]
    );

    // Send thank you message
    const thankYouMsg = `Thank you so much for the payment! It was a pleasure working with you. If you need any future designs or revisions, feel free to reach out. Looking forward to working together again! 🎉`;

    if (global.broadcast) {
      global.broadcast({
        type: 'PAYMENT_CONFIRMED',
        job_id: jobId,
        amount: amount,
        transactionId: transactionId,
      });
    }

    return {
      success: true,
      message: 'Payment confirmed',
      earnings: amount,
    };
  } catch (err) {
    console.error('❌ Error confirming payment:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get job workflow status
 */
async function getJobWorkflow(jobId) {
  try {
    const job = await get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    if (!job) return { success: false, error: 'Job not found' };

    const workflow = {
      jobId: job.id,
      title: job.title,
      status: job.status,
      timeline: {
        scanned: job.created_at,
        analyzed: job.analyzed_at,
        approved: job.approved_at,
        submitted: job.submitted_at,
        completed: job.completed_at,
        paid: job.paid_at,
      },
      earnings: job.earnings,
      analysis: JSON.parse(job.analysis || '{}'),
      solution: JSON.parse(job.solution || '{}'),
      deliverable_url: job.deliverable_url,
    };

    return { success: true, workflow };
  } catch (err) {
    console.error('❌ Error getting workflow:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get all jobs by status
 */
async function getJobsByStatus(status) {
  try {
    const jobs = await all(
      'SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC',
      [status]
    );

    return {
      success: true,
      status: status,
      count: jobs.length,
      jobs: jobs.map(job => ({
        ...job,
        analysis: JSON.parse(job.analysis || '{}'),
        solution: JSON.parse(job.solution || '{}'),
      })),
    };
  } catch (err) {
    console.error('❌ Error getting jobs by status:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get earnings summary
 */
async function getEarningsSummary() {
  try {
    const summary = await get(`
      SELECT
        COUNT(*) as total_completed,
        COALESCE(SUM(earnings), 0) as total_earnings,
        ROUND(AVG(earnings), 2) as avg_earnings,
        MAX(earnings) as highest_earning,
        MIN(earnings) as lowest_earning
      FROM jobs WHERE status = 'COMPLETED'
    `);

    const byDate = await all(`
      SELECT
        DATE(completed_at) as date,
        COUNT(*) as jobs,
        SUM(earnings) as earnings
      FROM jobs WHERE status = 'COMPLETED' AND completed_at IS NOT NULL
      GROUP BY DATE(completed_at)
      ORDER BY date DESC
      LIMIT 30
    `);

    return {
      success: true,
      summary: summary || {},
      byDate: byDate,
    };
  } catch (err) {
    console.error('❌ Error getting earnings summary:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  acceptJob,
  startWork,
  submitDeliverable,
  requestPayment,
  confirmPayment,
  getJobWorkflow,
  getJobsByStatus,
  getEarningsSummary,
};
