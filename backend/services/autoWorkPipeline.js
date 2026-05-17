const { AIEngine } = require('./aiEngine');
const { WorkExecutor } = require('./workExecutor');
const { GitHubAPI } = require('./githubAPI');
const { run, all, get } = require('../db/database');

class AutoWorkPipeline {
  constructor() {
    this.aiEngine = new AIEngine();
    this.workExecutor = new WorkExecutor();
    this.githubAPI = new GitHubAPI();
    this.isProcessing = false;
    this.activeJobs = new Map();
    this.learningDatabase = {};
  }

  /**
   * PHASE 1: Analyze bounty and decide if we should accept it
   */
  async analyzeAndDecide(bounty) {
    try {
      console.log(`\n📊 Analyzing bounty: ${bounty.title}`);

      // Analyze requirements
      const analysis = await this.aiEngine.analyzeIssueRequirements(
        bounty.title,
        bounty.description
      );

      if (!analysis.success) {
        console.log('⚠️ Failed to analyze:', analysis.error);
        return { shouldAccept: false, reason: 'Analysis failed' };
      }

      const { analysis: issueAnalysis } = analysis;

      // Check if we have the skills
      const userSkills = (process.env.FREELANCER_USER_SKILLS || '').split(',').map(s => s.trim().toLowerCase());
      const requiredSkills = (issueAnalysis.requiredSkills || []).map(s => s.toLowerCase());
      const hasSkills = requiredSkills.some(skill =>
        userSkills.some(us => us.includes(skill) || skill.includes(us))
      );

      // Check if difficulty is acceptable
      const acceptableDifficulty = ['easy', 'medium'].includes(issueAnalysis.difficulty);

      // Check if estimated hours is reasonable (max 40 hours)
      const reasonableTime = issueAnalysis.estimatedHours <= 40;

      const shouldAccept = hasSkills && acceptableDifficulty && reasonableTime;

      console.log(`
✅ Analysis Complete:
  - Has Skills: ${hasSkills}
  - Difficulty: ${issueAnalysis.difficulty} (acceptable: ${acceptableDifficulty})
  - Est. Hours: ${issueAnalysis.estimatedHours}h (reasonable: ${reasonableTime})
  - Decision: ${shouldAccept ? '✅ ACCEPT' : '❌ SKIP'}
      `);

      return {
        shouldAccept,
        analysis: issueAnalysis,
        reason: !hasSkills ? 'Missing skills' : !acceptableDifficulty ? 'Too difficult' : !reasonableTime ? 'Too time-consuming' : 'Good fit',
      };
    } catch (err) {
      console.error('❌ Error analyzing bounty:', err.message);
      return { shouldAccept: false, reason: err.message };
    }
  }

  /**
   * PHASE 1: Accept bounty and post comment
   */
  async acceptBounty(bounty, analysis) {
    try {
      console.log(`\n✅ Accepting bounty: ${bounty.title}`);

      // Parse GitHub URL
      const urlParts = bounty.project_url.split('/');
      const owner = urlParts[3];
      const repo = urlParts[4];
      const issueNumber = urlParts[6];

      // Generate acceptance comment
      const acceptanceComment = `Hi! I'm interested in working on this issue.

**My Analysis:**
- Difficulty: ${analysis.difficulty}
- Estimated Time: ${analysis.estimatedHours} hours
- Approach: ${analysis.suggestedApproach}

I have experience with the required skills and I'm confident I can deliver a high-quality solution that meets all acceptance criteria.

I'll start working on this right away and will submit a PR with a complete solution.`;

      // Post comment
      const commentResult = await this.githubAPI.postComment(
        owner,
        repo,
        issueNumber,
        acceptanceComment
      );

      if (!commentResult.success) {
        return { success: false, error: commentResult.error };
      }

      // Update database
      await run(
        'UPDATE jobs SET status = ?, bid_placed = 1, bid_placed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['IN_PROGRESS', bounty.id]
      );

      console.log('✅ Bounty accepted and comment posted');
      return { success: true };
    } catch (err) {
      console.error('❌ Error accepting bounty:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * PHASE 1: Generate solution
   */
  async generateSolution(bounty, analysis) {
    try {
      console.log(`\n🔧 Generating solution for: ${bounty.title}`);

      // Generate code
      const codeResult = await this.aiEngine.generateSolution(analysis);
      if (!codeResult.success) {
        return { success: false, error: codeResult.error };
      }

      // Generate tests
      const testsResult = await this.aiEngine.generateTests(analysis, codeResult.code);
      if (!testsResult.success) {
        console.log('⚠️ Failed to generate tests, continuing anyway');
      }

      // Generate PR description
      const prResult = await this.aiEngine.generatePRDescription(analysis, codeResult.code);
      if (!prResult.success) {
        console.log('⚠️ Failed to generate PR description');
      }

      console.log('✅ Solution generated');
      return {
        success: true,
        code: codeResult.code,
        tests: testsResult.success ? testsResult.tests : '',
        prDescription: prResult.success ? prResult.description : 'Auto-generated solution',
      };
    } catch (err) {
      console.error('❌ Error generating solution:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * PHASE 1: Execute work (clone, code, test, commit, push, PR)
   */
  async executeWork(bounty, solution, analysis) {
    try {
      console.log(`\n⚙️ Executing work for: ${bounty.title}`);

      // Parse GitHub URL
      const urlParts = bounty.project_url.split('/');
      const owner = urlParts[3];
      const repo = urlParts[4];
      const branchName = `fix/${bounty.id.substring(0, 8)}`;

      // Determine file to modify (from analysis)
      const filePath = analysis.filesThatNeedChanges?.[0] || 'solution.js';

      // Execute workflow
      const workResult = await this.workExecutor.executeWorkflow(
        owner,
        repo,
        bounty.id,
        branchName,
        {
          filePath,
          code: solution.code,
          commitMessage: `Fix: ${bounty.title}`,
        },
        `[AUTO] ${bounty.title}`,
        solution.prDescription
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
      };
    } catch (err) {
      console.error('❌ Error executing work:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * PHASE 2: Monitor PR and handle feedback
   */
  async monitorPR(bounty, prNumber, owner, repo) {
    try {
      console.log(`\n👀 Monitoring PR #${prNumber}`);

      // Get PR details
      const prDetails = await this.githubAPI.getPRDetails(owner, repo, prNumber);
      if (!prDetails.success) {
        return { success: false, error: prDetails.error };
      }

      const pr = prDetails.pr;

      // Check if merged
      if (pr.merged) {
        console.log('✅ PR merged successfully!');
        await run(
          'UPDATE jobs SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['COMPLETED', bounty.id]
        );
        return { success: true, status: 'merged' };
      }

      // Check for review comments
      const reviews = await this.githubAPI.getPRReviews(owner, repo, prNumber);
      if (reviews.success && reviews.reviews.length > 0) {
        console.log(`📝 Found ${reviews.reviews.length} review(s)`);
        return { success: true, status: 'needs_revision', reviews: reviews.reviews };
      }

      return { success: true, status: 'pending' };
    } catch (err) {
      console.error('❌ Error monitoring PR:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * PHASE 3: Learn from feedback and improve
   */
  async learnFromFeedback(bounty, feedback) {
    try {
      console.log(`\n📚 Learning from feedback for: ${bounty.title}`);

      // Store feedback in learning database
      if (!this.learningDatabase[bounty.id]) {
        this.learningDatabase[bounty.id] = {
          bountyId: bounty.id,
          title: bounty.title,
          attempts: 0,
          feedback: [],
        };
      }

      this.learningDatabase[bounty.id].feedback.push(feedback);
      this.learningDatabase[bounty.id].attempts++;

      // Analyze feedback to improve future solutions
      const improvementPrompt = `Based on this feedback, what should we improve for similar issues in the future?

Feedback: ${JSON.stringify(feedback, null, 2)}

Provide specific improvements as JSON:
{
  "improvements": ["improvement1", "improvement2"],
  "patternToAvoid": "pattern to avoid",
  "bestPractice": "best practice to follow"
}`;

      console.log('✅ Feedback stored for learning');
      return { success: true };
    } catch (err) {
      console.error('❌ Error learning from feedback:', err.message);
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
        // Skip if already processing
        if (this.activeJobs.has(bounty.id)) {
          console.log(`⏭️ Already processing ${bounty.id}`);
          continue;
        }

        // Mark as active
        this.activeJobs.set(bounty.id, { status: 'analyzing', startTime: Date.now() });

        // Process asynchronously (don't wait)
        this.processSingleBounty(bounty).then(result => {
          this.activeJobs.delete(bounty.id);
          results.push(result);
        }).catch(err => {
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

      // PHASE 1: Analyze
      const decision = await this.analyzeAndDecide(bounty);
      if (!decision.shouldAccept) {
        console.log(`⏭️ Skipping: ${decision.reason}`);
        return { bountyId: bounty.id, status: 'skipped', reason: decision.reason };
      }

      // PHASE 1: Accept
      const acceptResult = await this.acceptBounty(bounty, decision.analysis);
      if (!acceptResult.success) {
        return { bountyId: bounty.id, status: 'failed', error: acceptResult.error };
      }

      // PHASE 1: Generate
      const solutionResult = await this.generateSolution(bounty, decision.analysis);
      if (!solutionResult.success) {
        return { bountyId: bounty.id, status: 'failed', error: solutionResult.error };
      }

      // PHASE 1: Execute
      const workResult = await this.executeWork(bounty, solutionResult, decision.analysis);
      if (!workResult.success) {
        return { bountyId: bounty.id, status: 'failed', error: workResult.error };
      }

      // PHASE 2: Monitor (will continue in background)
      const urlParts = bounty.project_url.split('/');
      const owner = urlParts[3];
      const repo = urlParts[4];

      // Store PR info for monitoring
      await run(
        'UPDATE jobs SET solution = ? WHERE id = ?',
        [JSON.stringify({ prUrl: workResult.prUrl, prNumber: workResult.prNumber }), bounty.id]
      );

      console.log(`\n✅ BOUNTY PROCESSING COMPLETE`);
      console.log(`   PR: ${workResult.prUrl}`);
      console.log(`   Status: Waiting for review/merge`);

      return {
        bountyId: bounty.id,
        status: 'pr_created',
        prUrl: workResult.prUrl,
        prNumber: workResult.prNumber,
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
      jobs: Array.from(this.activeJobs.entries()).map(([id, job]) => ({
        id,
        ...job,
        duration: Date.now() - job.startTime,
      })),
      learningDatabase: Object.keys(this.learningDatabase).length,
    };
  }
}

module.exports = { AutoWorkPipeline };
