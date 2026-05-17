const { AdvancedRequirementAnalyzer } = require('./advancedRequirementAnalyzer');
const { IntelligentCodeGenerator } = require('./intelligentCodeGenerator');
const { WorkExecutor } = require('./workExecutor');
const { GitHubAPI } = require('./githubAPI');
const { FeedbackTracker } = require('./feedbackTracker');
const { run, all, get } = require('../db/database');

class SmartAutoWorkPipeline {
  constructor() {
    this.analyzer = new AdvancedRequirementAnalyzer();
    this.codeGenerator = new IntelligentCodeGenerator();
    this.workExecutor = new WorkExecutor();
    this.githubAPI = new GitHubAPI();
    this.feedbackTracker = new FeedbackTracker();
    this.isProcessing = false;
    this.activeJobs = new Map();
  }

  /**
   * PHASE 0: Filter and validate bounty
   */
  async validateBounty(bounty) {
    try {
      console.log(`\n🔍 Validating bounty: ${bounty.title}`);

      // Check if should be excluded
      const exclusion = this.analyzer.shouldExclude(bounty.title, bounty.description);
      if (exclusion.excluded) {
        console.log(`⏭️ Excluded: ${exclusion.reason}`);
        return {
          valid: false,
          reason: exclusion.reason,
        };
      }

      // Check if has budget
      const budget = this.analyzer.extractBudget(bounty.description, bounty.title);
      if (budget === 0) {
        console.log(`⏭️ No budget defined`);
        return {
          valid: false,
          reason: 'No budget defined',
        };
      }

      console.log(`✅ Budget: $${budget}`);
      return {
        valid: true,
        budget,
      };
    } catch (err) {
      console.error('❌ Error validating bounty:', err.message);
      return { valid: false, reason: err.message };
    }
  }

  /**
   * PHASE 1: Deep analyze bounty with GitHub context
   */
  async deepAnalyze(bounty, issueComments = []) {
    try {
      console.log(`\n📊 Deep analyzing bounty: ${bounty.title}`);

      const analysis = this.analyzer.parseGitHubIssue(
        bounty.title,
        bounty.description,
        issueComments
      );

      console.log(`
✅ Deep Analysis Complete:
  - Task Type: ${analysis.taskType}
  - Tech Stack: ${analysis.techStack.join(', ')}
  - Complexity: ${analysis.complexity}
  - Task Clarity: ${(analysis.taskClarity.score * 100).toFixed(0)}%
  - Is Real Task: ${analysis.isRealTask ? '✅ YES' : '❌ NO'}
  - Should Auto-Execute: ${analysis.shouldAutoExecute ? '✅ YES' : '❌ NO'}
  - Budget: $${analysis.budget}
  - Mentioned Files: ${analysis.mentionedFiles.length}
  - Acceptance Criteria: ${analysis.acceptanceCriteria.length}
      `);

      return analysis;
    } catch (err) {
      console.error('❌ Error analyzing bounty:', err.message);
      return null;
    }
  }

  /**
   * PHASE 1: Accept bounty and post comment
   */
  async acceptBounty(bounty, analysis) {
    try {
      console.log(`\n✅ Accepting bounty: ${bounty.title}`);

      if (!bounty.project_url) {
        return { success: false, error: 'No project URL' };
      }

      const urlParts = bounty.project_url.split('/');
      const owner = urlParts[3];
      const repo = urlParts[4];
      const issueNumber = urlParts[6];

      const acceptanceComment = `Hi! I'm interested in working on this issue.

**My Analysis:**
- Task Type: ${analysis.taskType}
- Difficulty: ${analysis.complexity}
- Estimated Time: ${analysis.estimatedHours} hours
- Tech Stack: ${analysis.techStack.join(', ')}
- Task Clarity: ${(analysis.taskClarity.score * 100).toFixed(0)}%

**Approach:**
${analysis.suggestedApproach}

**Acceptance Criteria:**
${analysis.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

I have experience with the required skills and I'm confident I can deliver a high-quality solution that meets all acceptance criteria.

I'll start working on this right away and will submit a PR with a complete solution.`;

      const commentResult = await this.githubAPI.postComment(
        owner,
        repo,
        issueNumber,
        acceptanceComment
      );

      if (!commentResult.success) {
        return { success: false, error: commentResult.error };
      }

      await run(
        'UPDATE jobs SET status = ?, bid_placed = 1, bid_placed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['IN_PROGRESS', bounty.id]
      );

      console.log('✅ Bounty accepted and comment posted');
      return { success: true, owner, repo, issueNumber };
    } catch (err) {
      console.error('❌ Error accepting bounty:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * PHASE 1: Generate real solution
   */
  async generateRealSolution(bounty, analysis) {
    try {
      console.log(`\n🔧 Generating real solution for: ${bounty.title}`);

      const solutions = this.codeGenerator.generateRealSolution(analysis, {
        title: bounty.title,
        description: bounty.description,
      });

      console.log(`✅ Generated ${solutions.length} file(s):`);
      solutions.forEach(s => console.log(`   - ${s.filePath}`));

      return {
        success: true,
        solutions,
      };
    } catch (err) {
      console.error('❌ Error generating solution:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * PHASE 1: Execute work (clone, code, test, commit, push, PR)
   */
  async executeWork(bounty, solutions, analysis) {
    try {
      console.log(`\n⚙️ Executing work for: ${bounty.title}`);

      if (!bounty.project_url) {
        return { success: false, error: 'No project URL' };
      }

      const urlParts = bounty.project_url.split('/');
      const owner = urlParts[3];
      const repo = urlParts[4];
      const branchName = `fix/${bounty.id.substring(0, 8)}`;

      // For multi-file solutions, use first file as primary
      const primarySolution = solutions[0];

      const workResult = await this.workExecutor.executeWorkflow(
        owner,
        repo,
        bounty.id,
        branchName,
        {
          filePath: primarySolution.filePath,
          code: primarySolution.code,
          commitMessage: `Fix: ${bounty.title}`,
        },
        `[AUTO] ${bounty.title}`,
        `Auto-generated solution for: ${bounty.title}

**Task Type:** ${analysis.taskType}
**Complexity:** ${analysis.complexity}
**Files Modified:** ${solutions.length}

**Acceptance Criteria:**
${analysis.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

**Solution Files:**
${solutions.map(s => `- ${s.filePath}`).join('\n')}`
      );

      if (!workResult.success) {
        return { success: false, error: workResult.error };
      }

      console.log(`✅ Work executed. PR: ${workResult.prUrl}`);
      return {
        success: true,
        prUrl: workResult.prUrl,
        prNumber: workResult.prNumber,
        testsPassed: workResult.testsPassed,
        simulated: workResult.simulated || false,
        owner,
        repo,
      };
    } catch (err) {
      console.error('❌ Error executing work:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * PHASE 2: Start feedback tracking
   */
  async startFeedbackTracking(bounty, prNumber, owner, repo, issueNumber) {
    try {
      console.log(`\n👀 Starting feedback tracking for PR #${prNumber}`);

      this.feedbackTracker.startTracking(bounty.id, owner, repo, issueNumber, prNumber);

      // Start polling if not already started
      if (!this.feedbackTracker.pollingInterval) {
        this.feedbackTracker.startPolling(30000); // Poll every 30 seconds
      }

      return { success: true };
    } catch (err) {
      console.error('❌ Error starting feedback tracking:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * PHASE 3: Process multiple bounties in parallel
   */
  async processMultipleBounties(bounties) {
    try {
      console.log(`\n🚀 Processing ${bounties.length} bounties in parallel`);

      const results = [];

      for (const bounty of bounties) {
        if (this.activeJobs.has(bounty.id)) {
          console.log(`⏭️ Already processing ${bounty.id}`);
          continue;
        }

        this.activeJobs.set(bounty.id, { status: 'validating', startTime: Date.now() });

        this.processSingleBounty(bounty)
          .then(result => {
            this.activeJobs.delete(bounty.id);
            results.push(result);
          })
          .catch(err => {
            console.error(`❌ Error processing ${bounty.id}:`, err.message);
            this.activeJobs.delete(bounty.id);
          });
      }

      return {
        success: true,
        processing: this.activeJobs.size,
        message: `Started processing ${bounties.length} bounties`,
      };
    } catch (err) {
      console.error('❌ Error processing bounties:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Process a single bounty through the complete pipeline
   */
  async processSingleBounty(bounty) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🎯 PROCESSING BOUNTY: ${bounty.title}`);
      console.log(`${'='.repeat(60)}`);

      // PHASE 0: Validate
      const validation = await this.validateBounty(bounty);
      if (!validation.valid) {
        console.log(`⏭️ Skipping: ${validation.reason}`);
        await run(
          'UPDATE jobs SET status = ? WHERE id = ?',
          ['SKIPPED', bounty.id]
        );
        return { bountyId: bounty.id, status: 'skipped', reason: validation.reason };
      }

      // Get issue comments for deep analysis
      const urlParts = bounty.project_url.split('/');
      const owner = urlParts[3];
      const repo = urlParts[4];
      const issueNumber = urlParts[6];

      const commentsResult = await this.githubAPI.getIssueComments(owner, repo, issueNumber);
      const issueComments = commentsResult.success ? commentsResult.comments : [];

      // PHASE 1: Deep Analyze
      const analysis = await this.deepAnalyze(bounty, issueComments);
      if (!analysis || !analysis.isRealTask) {
        console.log(`⏭️ Not a real task or too vague`);
        await run(
          'UPDATE jobs SET status = ? WHERE id = ?',
          ['SKIPPED', bounty.id]
        );
        return { bountyId: bounty.id, status: 'skipped', reason: 'Not a real task' };
      }

      // PHASE 1: Accept
      const acceptResult = await this.acceptBounty(bounty, analysis);
      if (!acceptResult.success) {
        return { bountyId: bounty.id, status: 'failed', error: acceptResult.error };
      }

      // PHASE 1: Generate
      const solutionResult = await this.generateRealSolution(bounty, analysis);
      if (!solutionResult.success) {
        return { bountyId: bounty.id, status: 'failed', error: solutionResult.error };
      }

      // PHASE 1: Execute
      const workResult = await this.executeWork(bounty, solutionResult.solutions, analysis);
      if (!workResult.success) {
        return { bountyId: bounty.id, status: 'failed', error: workResult.error };
      }

      // PHASE 2: Start Feedback Tracking (only if real PR)
      if (!workResult.simulated) {
        await this.startFeedbackTracking(
          bounty,
          workResult.prNumber,
          workResult.owner,
          workResult.repo,
          issueNumber
        );
      } else {
        console.log(`\n⏭️ Skipped feedback tracking (PR is simulated)`);
      }

      // Update database
      await run(
        'UPDATE jobs SET solution = ?, auto_execute = ? WHERE id = ?',
        [JSON.stringify({ prUrl: workResult.prUrl, prNumber: workResult.prNumber }), analysis.shouldAutoExecute ? 1 : 0, bounty.id]
      );

      console.log(`\n✅ BOUNTY PROCESSING COMPLETE`);
      console.log(`   PR: ${workResult.prUrl}`);
      console.log(`   Status: Waiting for review/merge`);
      console.log(`   Auto-Execute: ${analysis.shouldAutoExecute ? 'YES' : 'NO'}`);

      return {
        bountyId: bounty.id,
        status: 'pr_created',
        prUrl: workResult.prUrl,
        prNumber: workResult.prNumber,
        autoExecute: analysis.shouldAutoExecute,
      };
    } catch (err) {
      console.error(`❌ Error processing bounty ${bounty.id}:`, err.message);
      return { bountyId: bounty.id, status: 'error', error: err.message };
    }
  }

  /**
   * Get status of all active jobs
   */
  getStatus() {
    return {
      activeJobs: this.activeJobs.size,
      trackedIssues: this.feedbackTracker.getTrackingStatus(),
      jobs: Array.from(this.activeJobs.entries()).map(([id, job]) => ({
        id,
        ...job,
        duration: Date.now() - job.startTime,
      })),
    };
  }

  /**
   * Cleanup and shutdown
   */
  shutdown() {
    this.feedbackTracker.stopPolling();
    console.log('🛑 Pipeline shutdown complete');
  }
}

module.exports = { SmartAutoWorkPipeline };
