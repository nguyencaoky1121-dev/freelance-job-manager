const { GitHubAPI } = require('./githubAPI');
const { run, all, get } = require('../db/database');

class FeedbackTracker {
  constructor() {
    this.githubAPI = new GitHubAPI();
    this.trackedIssues = new Map();
    this.pollingInterval = null;
  }

  /**
   * Start tracking feedback for a submitted PR
   */
  async startTracking(bountyId, owner, repo, issueNumber, prNumber) {
    this.trackedIssues.set(bountyId, {
      owner,
      repo,
      issueNumber,
      prNumber,
      lastCheckedAt: new Date(),
      lastCommentId: null,
      feedbackCount: 0,
    });

    console.log(`👀 Tracking feedback for ${owner}/${repo}#${issueNumber} (PR #${prNumber})`);
  }

  /**
   * Check for new comments on tracked issues
   */
  async checkFeedback(bountyId) {
    const tracked = this.trackedIssues.get(bountyId);
    if (!tracked) return { hasNewFeedback: false };

    try {
      const { owner, repo, issueNumber, prNumber, lastCheckedAt } = tracked;

      // Get issue comments
      const issueComments = await this.githubAPI.getIssueComments(owner, repo, issueNumber);
      if (!issueComments.success) {
        if (issueComments.error && issueComments.error.includes('404')) {
          this.trackedIssues.delete(bountyId);
          return { hasNewFeedback: false };
        }
        return { hasNewFeedback: false };
      }

      // Get PR review comments
      const prReviews = prNumber ? await this.githubAPI.getPRReviews(owner, repo, prNumber) : null;
      if (prReviews && !prReviews.success) {
        if (prReviews.error && prReviews.error.includes('404')) {
          // If PR reviews 404, the PR might be simulated or deleted
          this.trackedIssues.delete(bountyId);
          return { hasNewFeedback: false };
        }
      }

      // Filter new comments since last check
      const newComments = issueComments.comments.filter(c => {
        const commentDate = new Date(c.created_at);
        return commentDate > lastCheckedAt;
      });

      // Filter out our own comments
      const username = process.env.GITHUB_USERNAME || '';
      const externalComments = newComments.filter(c => {
        return c.user?.login !== username;
      });

      // Categorize feedback
      const feedback = externalComments.map(comment => ({
        id: comment.id,
        author: comment.user?.login || 'unknown',
        body: comment.body,
        createdAt: comment.created_at,
        type: this.categorizeFeedback(comment.body),
      }));

      // Update tracking
      tracked.lastCheckedAt = new Date();
      tracked.feedbackCount += feedback.length;
      if (feedback.length > 0) {
        tracked.lastCommentId = feedback[feedback.length - 1].id;
      }

      return {
        hasNewFeedback: feedback.length > 0,
        feedback,
        totalFeedback: tracked.feedbackCount,
      };
    } catch (err) {
      console.error(`❌ Error checking feedback for ${bountyId}:`, err.message);
      return { hasNewFeedback: false, error: err.message };
    }
  }

  /**
   * Categorize feedback type
   */
  categorizeFeedback(body) {
    const lowerBody = body.toLowerCase();

    if (lowerBody.includes('approved') || lowerBody.includes('lgtm') || lowerBody.includes('looks good')) {
      return 'approval';
    }
    if (lowerBody.includes('changes requested') || lowerBody.includes('fix') || lowerBody.includes('need to')) {
      return 'changes_requested';
    }
    if (lowerBody.includes('question') || lowerBody.includes('clarif') || lowerBody.includes('?')) {
      return 'question';
    }
    if (lowerBody.includes('rejected') || lowerBody.includes('closed') || lowerBody.includes('won\'t')) {
      return 'rejection';
    }
    if (lowerBody.includes('merged') || lowerBody.includes('reward') || lowerBody.includes('paid')) {
      return 'completion';
    }

    return 'general';
  }

  /**
   * Detect new instructions/feedback from comments
   */
  detectNewInstructions(currentComments, lastCommentId) {
    if (!currentComments || currentComments.length === 0) return null;
    if (!lastCommentId) {
      // If no lastCommentId is tracked, consider the latest external comment as the new instruction point
      const lastExternalComment = currentComments
        .filter(c => c.user?.login !== (process.env.GITHUB_USERNAME || ''))
        .sort((a, b) => b.id - a.id)[0];
      return lastExternalComment || null;
    }

    let newComment = null;
    // Find the first comment that is newer than the last tracked comment
    for (let i = 0; i < currentComments.length; i++) {
      if (currentComments[i].id > lastCommentId) {
        newComment = currentComments[i];
        break;
      }
    }
    return newComment;
  }

  /**
   * Generate response to feedback
   */
  generateResponse(feedback) {
    switch (feedback.type) {
      case 'changes_requested':
        return this.generateChangesResponse(feedback);
      case 'question':
        return this.generateQuestionResponse(feedback);
      case 'approval':
        return 'Thank you for the approval! Looking forward to the merge.';
      case 'rejection':
        return null; // Don't auto-respond to rejections
      case 'completion':
        return 'Thank you! Glad the solution was helpful.';
      default:
        return this.generateGeneralResponse(feedback);
    }
  }

  /**
   * Generate response for changes requested
   */
  generateChangesResponse(feedback) {
    const body = feedback.body;

    // Extract what needs to change
    const changeRequests = [];
    const lines = body.split('\n').filter(l => l.trim());

    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('please') || lower.includes('should') || lower.includes('need') || lower.includes('fix')) {
        changeRequests.push(line.trim());
      }
    });

    if (changeRequests.length > 0) {
      return `Thank you for the feedback! I'll address the following:

${changeRequests.map((r, i) => `${i + 1}. ${r}`).join('\n')}

I'll update the PR shortly.`;
    }

    return `Thank you for the feedback! I'll review and update the PR accordingly.`;
  }

  /**
   * Generate response for questions
   */
  generateQuestionResponse(feedback) {
    const body = feedback.body;

    // Check for common question patterns
    if (body.includes('why')) {
      return `Great question! I chose this approach because it follows best practices for maintainability and performance. Let me know if you'd like me to explain further or take a different approach.`;
    }

    if (body.includes('how')) {
      return `I'll explain the implementation details. The solution follows the requirements outlined in the issue. If you need more specifics, I'm happy to elaborate.`;
    }

    return `Thanks for the question! I'll respond with the relevant details shortly.`;
  }

  /**
   * Generate general response
   */
  generateGeneralResponse(feedback) {
    return `Thank you for your comment! I'll take it into consideration.`;
  }

  /**
   * Respond to feedback on GitHub
   */
  async respondToFeedback(bountyId, feedback) {
    const tracked = this.trackedIssues.get(bountyId);
    if (!tracked) return { success: false, error: 'Not tracking this bounty' };

    const response = this.generateResponse(feedback);
    if (!response) return { success: true, skipped: true };

    const { owner, repo, issueNumber } = tracked;

    const result = await this.githubAPI.postComment(owner, repo, issueNumber, response);
    return result;
  }

  /**
   * Check PR status
   */
  async checkPRStatus(bountyId) {
    const tracked = this.trackedIssues.get(bountyId);
    if (!tracked || !tracked.prNumber) return null;

    const { owner, repo, prNumber } = tracked;

    try {
      const prDetails = await this.githubAPI.getPRDetails(owner, repo, prNumber);
      if (!prDetails.success) {
        // If PR not found (e.g., simulated PRs), remove from tracking
        if (prDetails.error && prDetails.error.includes('404')) {
          console.log(`🗑️ Untracking simulated/non-existent PR ${owner}/${repo}#${prNumber}`);
          this.trackedIssues.delete(bountyId);
          return null; // Stop tracking this PR
        }
        console.warn(`⚠️ Error getting PR details for ${owner}/${repo}#${prNumber}:`, prDetails.error);
        return null;
      }

      return {
        state: prDetails.pr.state,
        merged: prDetails.pr.merged,
        mergeable: prDetails.pr.mergeable,
        reviews: prDetails.pr.reviews || 0,
      };
    } catch (err) {
      console.error(`❌ Unexpected error checking PR status for ${bountyId}:`, err.message);
      return null;
    }
  }

  /**
   * Start polling loop
   */
  startPolling(intervalMs = 60000) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      for (const [bountyId] of this.trackedIssues) {
        try {
          const tracked = this.trackedIssues.get(bountyId);
          const feedbackResult = await this.checkFeedback(bountyId);
          if (feedbackResult.hasNewFeedback) {
            console.log(`📬 New feedback for ${bountyId}: ${feedbackResult.feedback.length} comment(s)`);

            // Broadcast to dashboard
            if (global.broadcast) {
              for (const fb of feedbackResult.feedback) {
                global.broadcast({
                  type: 'FEEDBACK_RECEIVED',
                  bountyId,
                  repo: `${tracked.owner}/${tracked.repo}`,
                  issue: tracked.issueNumber,
                  category: fb.type,
                  author: fb.author,
                });
              }
            }

            // Auto-respond to each feedback
            for (const fb of feedbackResult.feedback) {
              await this.respondToFeedback(bountyId, fb);
            }
          }

          // Check PR status
          const prStatus = await this.checkPRStatus(bountyId);
          if (prStatus?.merged) {
            console.log(`✅ PR merged for ${bountyId}!`);

            // Broadcast merge event
            if (global.broadcast) {
              global.broadcast({
                type: 'PR_MERGED',
                bountyId,
                repo: `${tracked.owner}/${tracked.repo}`,
                prNumber: tracked.prNumber,
              });
            }

            await run(
              'UPDATE jobs SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
              ['COMPLETED', bountyId]
            );
            this.trackedIssues.delete(bountyId);
          } else if (prStatus?.state === 'closed' && !prStatus?.merged) {
            console.log(`❌ PR rejected/closed for ${bountyId}`);

            // Broadcast rejection event
            if (global.broadcast) {
              global.broadcast({
                type: 'PR_REJECTED',
                bountyId,
                repo: `${tracked.owner}/${tracked.repo}`,
                prNumber: tracked.prNumber,
              });
            }

            await run(
              'UPDATE jobs SET status = ? WHERE id = ?',
              ['REJECTED', bountyId]
            );
            this.trackedIssues.delete(bountyId);
          }
        } catch (err) {
          console.error(`❌ Polling error for ${bountyId}:`, err.message);
        }
      }
    }, intervalMs);

    console.log(`🔄 Feedback polling started (every ${intervalMs / 1000}s)`);
  }

  /**
   * Stop polling loop
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Get tracking status
   */
  getTrackingStatus() {
    const tracked = [];
    this.trackedIssues.forEach((data, id) => {
      tracked.push({
        bountyId: id,
        repo: `${data.owner}/${data.repo}`,
        issue: data.issueNumber,
        pr: data.prNumber,
        feedbackCount: data.feedbackCount,
        lastChecked: data.lastCheckedAt,
      });
    });
    return tracked;
  }
}

module.exports = { FeedbackTracker };
