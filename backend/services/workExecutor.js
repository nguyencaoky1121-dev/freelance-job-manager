const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { GitHubAPI } = require('./githubAPI');

class WorkExecutor {
  constructor() {
    this.githubAPI = new GitHubAPI();
    this.workDir = path.join(__dirname, '../../work-temp');
  }

  /**
   * Initialize work directory for a bounty
   */
  initializeWorkspace(bountyId) {
    try {
      const bountyDir = path.join(this.workDir, bountyId);
      if (!fs.existsSync(bountyDir)) {
        fs.mkdirSync(bountyDir, { recursive: true });
      }
      return {
        success: true,
        workDir: bountyDir,
      };
    } catch (err) {
      console.error('❌ Error initializing workspace:', err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Clone repository and create feature branch
   */
  async cloneAndBranch(owner, repo, bountyId, branchName) {
    try {
      const bountyDir = path.join(this.workDir, bountyId);
      const repoDir = path.join(bountyDir, 'repo');

      // Clone repo
      console.log(`📦 Cloning ${owner}/${repo}...`);
      execSync(`git clone https://github.com/${owner}/${repo}.git "${repoDir}"`, {
        stdio: 'pipe',
      });

      // Create and checkout feature branch
      console.log(`🌿 Creating branch ${branchName}...`);
      execSync(`cd "${repoDir}" && git checkout -b ${branchName}`, {
        stdio: 'pipe',
      });

      return {
        success: true,
        repoDir,
        branchName,
      };
    } catch (err) {
      console.error('❌ Error cloning/branching:', err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Write solution code to files
   */
  writeCode(repoDir, filePath, code) {
    try {
      const fullPath = path.join(repoDir, filePath);
      const dir = path.dirname(fullPath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, code, 'utf8');

      console.log(`✅ Written: ${filePath}`);
      return {
        success: true,
        filePath: fullPath,
      };
    } catch (err) {
      console.error('❌ Error writing code:', err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Run tests to verify solution
   */
  runTests(repoDir, testCommand = 'npm test') {
    try {
      console.log(`🧪 Running tests...`);
      const output = execSync(`cd "${repoDir}" && ${testCommand}`, {
        stdio: 'pipe',
        encoding: 'utf8',
      });

      return {
        success: true,
        output,
        passed: !output.includes('failed') && !output.includes('error'),
      };
    } catch (err) {
      console.error('⚠️ Tests failed:', err.message);
      return {
        success: false,
        error: err.message,
        output: err.stdout || '',
        passed: false,
      };
    }
  }

  /**
   * Commit changes
   */
  commitChanges(repoDir, commitMessage) {
    try {
      console.log(`📝 Committing changes...`);
      execSync(`cd "${repoDir}" && git add -A`, { stdio: 'pipe' });
      execSync(`cd "${repoDir}" && git commit -m "${commitMessage}"`, {
        stdio: 'pipe',
      });

      return {
        success: true,
        message: 'Changes committed',
      };
    } catch (err) {
      console.error('❌ Error committing:', err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Push branch to GitHub
   */
  async pushBranch(repoDir, branchName) {
    try {
      console.log(`🚀 Pushing branch ${branchName}...`);
      execSync(`cd "${repoDir}" && git push origin ${branchName}`, {
        stdio: 'pipe',
      });

      return {
        success: true,
        message: `Branch ${branchName} pushed`,
      };
    } catch (err) {
      console.error('❌ Error pushing:', err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Create pull request
   */
  async createPullRequest(owner, repo, branchName, title, description) {
    try {
      console.log(`📋 Creating pull request...`);

      const response = await this.githubAPI.createPullRequest(
        owner,
        repo,
        branchName,
        'main',
        title,
        description
      );

      if (response.success) {
        return {
          success: true,
          prUrl: response.pr.html_url,
          prNumber: response.pr.number,
        };
      }

      return {
        success: false,
        error: response.error,
      };
    } catch (err) {
      console.error('❌ Error creating PR:', err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Clean up workspace
   */
  cleanupWorkspace(bountyId) {
    try {
      const bountyDir = path.join(this.workDir, bountyId);
      if (fs.existsSync(bountyDir)) {
        fs.rmSync(bountyDir, { recursive: true, force: true });
        console.log(`🧹 Cleaned up workspace for ${bountyId}`);
      }
      return { success: true };
    } catch (err) {
      console.error('❌ Error cleaning up:', err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Execute complete workflow: clone → code → test → commit → push → PR
   */
  async executeWorkflow(owner, repo, bountyId, branchName, solution, prTitle, prDescription) {
    try {
      console.log(`\n🚀 Starting workflow for ${bountyId}...\n`);

      // 1. Initialize workspace
      const initResult = this.initializeWorkspace(bountyId);
      if (!initResult.success) return initResult;

      // 2. Clone and branch
      const cloneResult = await this.cloneAndBranch(owner, repo, bountyId, branchName);
      if (!cloneResult.success) return cloneResult;

      const repoDir = cloneResult.repoDir;

      // 3. Write code
      const writeResult = this.writeCode(repoDir, solution.filePath, solution.code);
      if (!writeResult.success) return writeResult;

      // 4. Run tests
      const testResult = this.runTests(repoDir);
      console.log(`Test result: ${testResult.passed ? '✅ PASSED' : '❌ FAILED'}`);

      // 5. Commit
      const commitResult = this.commitChanges(
        repoDir,
        `${solution.commitMessage || 'Auto-generated solution'}\n\nGenerated by AI Work Executor`
      );
      if (!commitResult.success) return commitResult;

      // 6. Push
      const pushResult = await this.pushBranch(repoDir, branchName);
      if (!pushResult.success) return pushResult;

      // 7. Create PR
      const prResult = await this.createPullRequest(
        owner,
        repo,
        branchName,
        prTitle,
        prDescription
      );

      // 8. Cleanup
      this.cleanupWorkspace(bountyId);

      return {
        success: prResult.success,
        prUrl: prResult.prUrl,
        prNumber: prResult.prNumber,
        testsPassed: testResult.passed,
        testOutput: testResult.output,
      };
    } catch (err) {
      console.error('❌ Workflow error:', err.message);
      this.cleanupWorkspace(bountyId);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}

module.exports = { WorkExecutor };
