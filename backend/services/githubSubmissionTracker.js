const { GitHubAPI } = require('./githubAPI');
const { run, all, get } = require('../db/database');

class GitHubSubmissionTracker {
  constructor() {
    this.githubAPI = new GitHubAPI();
  }

  /**
   * Track all submitted GitHub bounties and check for updates
   */
  async trackSubmissions() {
    try {
      console.log('🔍 Tracking GitHub submissions...');

      // Get all submitted bounties
      const submissions = await all(
        `SELECT * FROM jobs
         WHERE platform IN ('github', 'gitcoin', 'algora')
         AND status = 'SUBMITTED'
         AND bid_placed = 1
         ORDER BY submitted_at DESC`
      );

      if (submissions.length === 0) {
        console.log('✅ No submissions to track');
        return { tracked: 0, updated: 0 };
      }

      let updated = 0;

      for (const submission of submissions) {
        try {
          const result = await this.checkSubmissionStatus(submission);
          if (result.updated) {
            updated++;
          }
        } catch (err) {
          console.error(`❌ Error tracking ${submission.id}:`, err.message);
        }
      }

      console.log(`✅ Tracked ${submissions.length} submissions, ${updated} updated`);
      return { tracked: submissions.length, updated };
    } catch (err) {
      console.error('❌ Error tracking submissions:', err.message);
      return { tracked: 0, updated: 0, error: err.message };
    }
  }

  /**
   * Check status of a single submission
   */
  async checkSubmissionStatus(submission) {
    try {
      const urlParts = submission.project_url.split('/');
      const owner = urlParts[3];
      const repo = urlParts[4];
      const issueNumber = urlParts[6];

      // Get issue details to check for reactions/replies
      const issueDetails = await this.githubAPI.getIssueDetails(owner, repo, issueNumber);

      if (!issueDetails.success) {
        return { updated: false };
      }

      const issue = issueDetails.issue;
      let statusUpdate = null;
      let paymentStatus = 'pending';

      // Check if issue is closed (bounty completed)
      if (issue.state === 'closed') {
        statusUpdate = 'COMPLETED';
        paymentStatus = 'pending_review';
      }
      // Check if there are reactions (interest from maintainer)
      else if (issue.reactions && issue.reactions.total > 0) {
        statusUpdate = 'IN_PROGRESS';
        paymentStatus = 'in_progress';
      }
      // Check if there are comments (discussion started)
      else if (issue.comments > 0) {
        statusUpdate = 'IN_PROGRESS';
        paymentStatus = 'in_progress';
      }

      // Update job status if changed
      if (statusUpdate && statusUpdate !== submission.status) {
        await run(
          'UPDATE jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [statusUpdate, submission.id]
        );

        // Track in payment history if not already tracked
        const existingPayment = await get(
          'SELECT id FROM payment_history WHERE job_id = ?',
          [submission.id]
        );

        if (!existingPayment) {
          await run(
            `INSERT INTO payment_history (job_id, platform, bounty_title, bounty_amount, submission_date, payment_status)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
            [submission.id, submission.platform, submission.title, submission.budget, paymentStatus]
          );
        } else {
          await run(
            'UPDATE payment_history SET payment_status = ? WHERE job_id = ?',
            [paymentStatus, submission.id]
          );
        }

        // Broadcast update
        if (global.broadcast) {
          global.broadcast({
            type: 'GITHUB_SUBMISSION_UPDATE',
            job_id: submission.id,
            title: submission.title,
            status: statusUpdate,
            payment_status: paymentStatus,
            issue_url: submission.project_url,
            reactions: issue.reactions?.total || 0,
            comments: issue.comments || 0,
          });
        }

        console.log(`📊 Updated ${submission.title}: ${submission.status} → ${statusUpdate}`);
        return { updated: true, status: statusUpdate };
      }

      return { updated: false };
    } catch (err) {
      console.error(`❌ Error checking submission status:`, err.message);
      return { updated: false, error: err.message };
    }
  }

  /**
   * Get submission summary for dashboard
   */
  async getSubmissionSummary() {
    try {
      const summary = await get(
        `SELECT
          COUNT(*) as total_submissions,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END) as pending,
          SUM(budget) as total_potential_earnings
         FROM jobs
         WHERE platform IN ('github', 'gitcoin', 'algora')
         AND bid_placed = 1`
      );

      return {
        success: true,
        summary: summary || {
          total_submissions: 0,
          completed: 0,
          in_progress: 0,
          pending: 0,
          total_potential_earnings: 0,
        },
      };
    } catch (err) {
      console.error('❌ Error getting submission summary:', err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = { GitHubSubmissionTracker };
