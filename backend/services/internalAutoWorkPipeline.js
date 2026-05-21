const { SmartRequirementAnalyzer } = require('./smartRequirementAnalyzer');
const { CodeGeneratorEngine } = require('./codeGeneratorEngine');
const { WorkExecutor } = require('./workExecutor');
const { GitHubAPI } = require('./githubAPI');
const { run, all, get } = require('../db/database');

class InternalAutoWorkPipeline {
  constructor() {
    this.analyzer = new SmartRequirementAnalyzer();
    this.codeGenerator = new CodeGeneratorEngine();
    this.workExecutor = new WorkExecutor();
    this.githubAPI = new GitHubAPI();
    this.isProcessing = false;
    this.activeJobs = new Map();
  }

  /**
   * PHASE 1: Analyze bounty and decide if we should accept it
   */
  async analyzeAndDecide(bounty) {
    try {
      console.log(`\n📊 Analyzing bounty: ${bounty.title}`);
      if (global.sysLog) global.sysLog(`🔍 Đang phân tích yêu cầu: ${bounty.title}`, 'AUTOWORK_INFO');

      const analysis = this.analyzer.analyze(
        bounty.title,
        bounty.description,
        bounty.budget || 0
      );

      const userSkills = (process.env.FREELANCER_USER_SKILLS || '')
        .split(',')
        .map(s => s.trim().toLowerCase());

      const shouldAccept = this.analyzer.shouldAccept(analysis, userSkills);

      // Auto-accept for low budget bounties even if skills match is borderline
      let finalShouldAccept = shouldAccept;
      if (bounty.budget > 0 && bounty.budget <= 100 && analysis.confidence > 0.3) {
        finalShouldAccept = true;
        analysis.autoAccepted = true;
        analysis.autoAcceptReason = 'Tự động chấp nhận Bounty dưới $100';
      }

      console.log(`
✅ Analysis Complete:
  - Task Type: ${analysis.taskType}
  - Tech Stack: ${analysis.techStack.join(', ')}
  - Complexity: ${analysis.complexity}
  - Est. Hours: ${analysis.estimatedHours}h
  - Required Skills: ${analysis.requiredSkills.join(', ')}
  - Confidence: ${(analysis.confidence * 100).toFixed(0)}%
  - Decision: ${finalShouldAccept ? '✅ ACCEPT' : '❌ SKIP'}
      `);

      if (global.sysLog) {
        if (finalShouldAccept) {
          global.sysLog(`✅ Chấp nhận: ${analysis.taskType} (${analysis.complexity}) - Độ tin cậy: ${(analysis.confidence * 100).toFixed(0)}%`, 'AUTOWORK_INFO');
        } else {
          global.sysLog(`⏭️ Bỏ qua: ${bounty.title} (Không phù hợp kỹ năng hoặc quá phức tạp)`, 'AUTOWORK_INFO');
        }
      }

      return {
        shouldAccept: finalShouldAccept,
        analysis,
        reason: finalShouldAccept ? 'Good fit' : 'Does not meet criteria',
      };
    } catch (err) {
      console.error('❌ Error analyzing bounty:', err.message);
      if (global.sysLog) global.sysLog(`❌ Lỗi phân tích: ${err.message}`, 'AUTOWORK_ERROR');
      return { shouldAccept: false, reason: err.message };
    }
  }

  /**
   * PHASE 1: Accept bounty and post comment
   */
  async acceptBounty(bounty, analysis) {
    try {
      console.log(`\n✅ Accepting bounty: ${bounty.title}`);
      if (global.sysLog) global.sysLog(`🤝 Đang gửi bình luận nhận việc cho: ${bounty.title}`, 'AUTOWORK_INFO');

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

**Approach:**
${analysis.suggestedApproach}

I have experience with the required skills and I'm confident I can deliver a high-quality solution that meets all acceptance criteria.

I'll start working on this right away and will submit a PR with a complete solution.`;

      const commentResult = await this.githubAPI.postComment(
        owner,
        repo,
        issueNumber,
        acceptanceComment
      );

      if (!commentResult.success) {
        if (global.sysLog) global.sysLog(`⚠️ Lỗi gửi comment (có thể đã gửi trước đó): ${commentResult.error}`, 'AUTOWORK_WARNING');
        // Vẫn tiếp tục nếu lỗi chỉ là do comment trùng
        if (!commentResult.error.includes('already exists')) {
           return { success: false, error: commentResult.error };
        }
      }

      await run(
        'UPDATE jobs SET status = ?, bid_placed = 1, bid_placed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['IN_PROGRESS', bounty.id]
      );

      console.log('✅ Bounty accepted and comment posted');
      if (global.sysLog) global.sysLog(`🚀 Đã nhận việc và để lại lời nhắn thành công`, 'AUTOWORK_SUCCESS');
      return { success: true };
    } catch (err) {
      console.error('❌ Error accepting bounty:', err.message);
      if (global.sysLog) global.sysLog(`❌ Lỗi nhận việc: ${err.message}`, 'AUTOWORK_ERROR');
      return { success: false, error: err.message };
    }
  }

  /**
   * PHASE 1: Generate solution
   */
  async generateSolution(bounty, analysis) {
    try {
      console.log(`\n🔧 Generating solution for: ${bounty.title}`);
      if (global.sysLog) global.sysLog(`🤖 Đang sử dụng AI để lập trình giải pháp cho: ${bounty.title}`, 'AUTOWORK_START');

      const codeResult = await this.codeGenerator.generateCode(
        analysis,
        bounty.description
      );

      console.log(`✅ Solution generated: ${codeResult.fileName}`);
      if (global.sysLog) {
        const aiBadge = codeResult.isAI ? 'Gemini AI' : 'Template';
        global.sysLog(`✨ Đã tạo code xong (${aiBadge}): ${codeResult.fileName}`, 'AUTOWORK_SUCCESS');
      }
      return {
        success: true,
        code: codeResult.code,
        fileName: codeResult.fileName,
        language: codeResult.language,
      };
    } catch (err) {
      console.error('❌ Error generating solution:', err.message);
      if (global.sysLog) global.sysLog(`❌ Lỗi tạo code: ${err.message}`, 'AUTOWORK_ERROR');
      return { success: false, error: err.message };
    }
  }

  /**
   * PHASE 1: Execute work (clone, code, test, commit, push, PR)
   */
  async executeWork(bounty, solution, analysis) {
    try {
      console.log(`\n⚙️ Executing work for: ${bounty.title}`);
      if (global.sysLog) global.sysLog(`⚙️ Đang thực thi Git Workflow (Clone -> Commit -> Push -> PR)`, 'AUTOWORK_INFO');

      if (!bounty.project_url) {
        return { success: false, error: 'No project URL' };
      }

      const urlParts = bounty.project_url.split('/');
      const owner = urlParts[3];
      const repo = urlParts[4];
      const branchName = `fix/${bounty.id.substring(0, 8)}_${Date.now()}`;

      const filePath = analysis.filesThatNeedChanges?.[0] || 'solution.js';

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
        `Auto-generated solution for: ${bounty.title}\n\nTask Type: ${analysis.taskType}\nComplexity: ${analysis.complexity}\n\nGenerated by internal AI pipeline.`
      );

      if (!workResult.success) {
        if (global.sysLog) global.sysLog(`❌ Lỗi thực thi Git: ${workResult.error}`, 'AUTOWORK_ERROR');
        return { success: false, error: workResult.error };
      }

      console.log(`✅ Work executed. PR: ${workResult.prUrl}`);
      if (global.sysLog) global.sysLog(`🏆 THÀNH CÔNG: Đã tạo Pull Request! Link: ${workResult.prUrl}`, 'AUTOWORK_SUCCESS');

      return {
        success: true,
        prUrl: workResult.prUrl,
        prNumber: workResult.prNumber,
        testsPassed: workResult.testsPassed,
      };
    } catch (err) {
      console.error('❌ Error executing work:', err.message);
      if (global.sysLog) global.sysLog(`❌ Lỗi execute: ${err.message}`, 'AUTOWORK_ERROR');
      return { success: false, error: err.message };
    }
  }

  /**
   * PHASE 2: Monitor PR and handle feedback
   */
  async monitorPR(bounty, prNumber, owner, repo) {
    try {
      console.log(`\n👀 Monitoring PR #${prNumber}`);

      const prDetails = await this.githubAPI.getPRDetails(owner, repo, prNumber);
      if (!prDetails.success) {
        return { success: false, error: prDetails.error };
      }

      const pr = prDetails.pr;

      if (pr.merged) {
        console.log('✅ PR merged successfully!');
        await run(
          'UPDATE jobs SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['COMPLETED', bounty.id]
        );
        return { success: true, status: 'merged' };
      }

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

        this.activeJobs.set(bounty.id, { status: 'analyzing', startTime: Date.now() });

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

      // PHASE 1: Analyze
      const decision = await this.analyzeAndDecide(bounty);
      if (!decision.shouldAccept) {
        console.log(`⏭️ Skipping: ${decision.reason}`);
        await run(
          'UPDATE jobs SET status = ? WHERE id = ?',
          ['SKIPPED', bounty.id]
        );
        return { bountyId: bounty.id, status: 'skipped', reason: decision.reason };
      }

      // PHASE 1: Accept
      const acceptResult = await this.acceptBounty(bounty, decision.analysis);
      if (!acceptResult.success) {
        await run(
          'UPDATE jobs SET status = ?, logs = ? WHERE id = ?',
          ['FAILED', `Acceptance error: ${acceptResult.error}`, bounty.id]
        );
        return { bountyId: bounty.id, status: 'failed', error: acceptResult.error };
      }

      // PHASE 1: Generate
      const solutionResult = await this.generateSolution(bounty, decision.analysis);
      if (!solutionResult.success) {
        await run(
          'UPDATE jobs SET status = ?, logs = ? WHERE id = ?',
          ['FAILED', `Code generation error: ${solutionResult.error}`, bounty.id]
        );
        return { bountyId: bounty.id, status: 'failed', error: solutionResult.error };
      }

      // PHASE 1: Execute
      const workResult = await this.executeWork(bounty, solutionResult, decision.analysis);
      if (!workResult.success) {
        await run(
          'UPDATE jobs SET status = ?, logs = ? WHERE id = ?',
          ['FAILED', `Execution error: ${workResult.error}`, bounty.id]
        );
        return { bountyId: bounty.id, status: 'failed', error: workResult.error };
      }

      // PHASE 2: Monitor (will continue in background)
      const urlParts = bounty.project_url.split('/');
      const owner = urlParts[3];
      const repo = urlParts[4];

      await run(
        'UPDATE jobs SET solution = ?, status = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify({ prUrl: workResult.prUrl, prNumber: workResult.prNumber }), 'SUBMITTED', bounty.id]
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
    };
  }

  /**
   * One-Shot Processing: Trigger pipeline for a specific job immediately
   */
  async postAttemptOnly(jobId) {
    try {
      console.log(`\n⚙️ Triggering One-Shot Processing for job: ${jobId}`);

      // Fetch job details from DB
      const job = await get('SELECT * FROM jobs WHERE id = ?', [jobId]);

      if (!job) {
        console.error(`❌ Job ${jobId} not found in database`);
        return { success: false, error: 'Job not found' };
      }

      // Add to active jobs
      this.activeJobs.set(jobId, { status: 'starting', startTime: Date.now() });

      // Run processing
      const result = await this.processSingleBounty(job);

      // Remove from active jobs
      this.activeJobs.delete(jobId);

      return { success: true, result };
    } catch (err) {
      console.error(`❌ One-Shot processing failed for ${jobId}:`, err.message);
      this.activeJobs.delete(jobId);
      return { success: false, error: err.message };
    }
  }
}

module.exports = { InternalAutoWorkPipeline };
