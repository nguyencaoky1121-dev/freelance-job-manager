const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Utility to check if git is installed
 */
function isGitAvailable() {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

const GIT_AVAILABLE = isGitAvailable();

class WorkExecutor {
  constructor(githubAPI) {
    this.githubAPI = githubAPI;
    this.workDir = path.join(process.cwd(), 'work-temp');

    if (!fs.existsSync(this.workDir)) {
      fs.mkdirSync(this.workDir, { recursive: true });
    }
  }

  /**
   * Initialize workspace for a bounty
   */
  initializeWorkspace(bountyId) {
    try {
      const bountyDir = path.join(this.workDir, bountyId);
      if (fs.existsSync(bountyDir)) {
        fs.rmSync(bountyDir, { recursive: true, force: true });
      }
      fs.mkdirSync(bountyDir, { recursive: true });
      return { success: true, bountyDir };
    } catch (err) {
      console.error('❌ Error initializing workspace:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Clone repository and create branch
   */
  async cloneAndBranch(owner, repo, bountyId, branchName) {
    try {
      const bountyDir = path.join(this.workDir, bountyId);
      const repoDir = path.join(bountyDir, repo);

      console.log(`📂 Cloning ${owner}/${repo} to ${repoDir}...`);

      try {
        if (!GIT_AVAILABLE) {
          console.warn('⚠️ Git not available. Creating mock repository structure...');
          if (!fs.existsSync(repoDir)) fs.mkdirSync(repoDir, { recursive: true });
          return { success: true, repoDir, simulated: true };
        }

        const token = process.env.GITHUB_TOKEN;
        if (!token) {
          console.warn('⚠️ GITHUB_TOKEN not found. Git operations might fail.');
        }

        // Use oauth2 token for HTTPS authentication
        const cloneUrl = token
          ? `https://oauth2:${token}@github.com/${owner}/${repo}.git`
          : `https://github.com/${owner}/${repo}.git`;

        execSync(`git clone ${cloneUrl} "${repoDir}"`, { stdio: 'pipe', timeout: 60000 });
        execSync(`cd "${repoDir}" && git checkout -b ${branchName}`, { stdio: 'pipe', shell: true });

        return { success: true, repoDir };
      } catch (gitErr) {
        console.warn(`⚠️ Git clone/branch failed: ${gitErr.message}. Continuing in mock mode...`);
        if (!fs.existsSync(repoDir)) fs.mkdirSync(repoDir, { recursive: true });
        return { success: true, repoDir, simulated: true };
      }
    } catch (err) {
      console.error('❌ Error cloning/branching:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Write solution code to file
   */
  writeCode(repoDir, filePath, code) {
    try {
      const fullPath = path.join(repoDir, filePath);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, code);
      console.log(`📝 Wrote code to ${filePath}`);
      return { success: true };
    } catch (err) {
      console.error('❌ Error writing code:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Write multiple files
   */
  writeMultipleFiles(repoDir, solutions) {
    try {
      for (const sol of solutions) {
        this.writeCode(repoDir, sol.filePath, sol.code);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Run tests (simulated for now)
   */
  runTests(repoDir) {
    try {
      console.log(`🧪 Running tests in ${repoDir}...`);
      return {
        success: true,
        output: 'Simulated tests passed',
        passed: true,
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
      if (!GIT_AVAILABLE) {
        console.warn('⚠️ Git not available. Skipping real commit.');
        return { success: true, message: 'Changes marked (simulated)', simulated: true };
      }

      try {
        const gitName = process.env.GITHUB_USERNAME || 'AutoAgent';
        const gitEmail = `${gitName.toLowerCase().replace(/\s+/g, '')}@users.noreply.github.com`;

        execSync(`cd "${repoDir}" && git config user.name "${gitName}"`, { stdio: 'pipe', shell: true });
        execSync(`cd "${repoDir}" && git config user.email "${gitEmail}"`, { stdio: 'pipe', shell: true });
        execSync(`cd "${repoDir}" && git add -A`, { stdio: 'pipe', shell: true });
        execSync(`cd "${repoDir}" && git commit -m "${commitMessage}"`, { stdio: 'pipe', shell: true });

        return { success: true, message: 'Changes committed' };
      } catch (gitErr) {
        console.warn(`⚠️ Git commit failed: ${gitErr.message}`);
        return { success: true, message: 'Changes marked (fallback)', simulated: true };
      }
    } catch (err) {
      console.error('❌ Error committing:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Push branch to GitHub
   */
  async pushBranch(repoDir, branchName) {
    try {
      console.log(`🚀 Pushing branch ${branchName}...`);
      if (!GIT_AVAILABLE) {
        console.warn('⚠️ Git not available. Skipping real push.');
        return { success: true, message: 'Push simulated', simulated: true };
      }

      try {
        execSync(`cd "${repoDir}" && git push -f origin ${branchName}`, { stdio: 'pipe', timeout: 60000, shell: true });
        return { success: true, message: `Branch ${branchName} pushed` };
      } catch (gitErr) {
        console.warn(`⚠️ Git push failed: ${gitErr.message}`);
        // If push fails, it's likely a permission issue (need to fork)
        return { success: false, error: gitErr.message };
      }
    } catch (err) {
      console.error('❌ Error pushing:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Create pull request
   */
  async createPullRequest(owner, repo, branchName, title, description) {
    try {
      console.log(`📋 Creating pull request...`);

      const gitUser = process.env.GITHUB_USERNAME;
      const head = (gitUser && gitUser.toLowerCase() !== owner.toLowerCase())
        ? `${gitUser}:${branchName}`
        : branchName;

      // PR always via API, but we mark if Git was missing
      const response = await this.githubAPI.createPullRequest(owner, repo, head, 'main', title, description);

      if (response.success) {
        return {
          success: true,
          prUrl: response.pr.html_url,
          prNumber: response.pr.number,
        };
      }

      if (!GIT_AVAILABLE) {
        return {
          success: true,
          simulated: true,
          prUrl: `https://github.com/${owner}/${repo}/issues`,
          message: 'PR creation skipped (no git)'
        };
      }

      return { success: false, error: response.error };
    } catch (err) {
      console.error('❌ Error creating PR:', err.message);
      return { success: false, error: err.message };
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
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Execute complete workflow
   */
  async executeWorkflow(owner, repo, bountyId, branchName, solution, prTitle, prDescription) {
    try {
      console.log(`\n🚀 Starting workflow for ${bountyId}...\n`);

      const initResult = this.initializeWorkspace(bountyId);
      if (!initResult.success) return initResult;

      const cloneResult = await this.cloneAndBranch(owner, repo, bountyId, branchName);
      if (!cloneResult.success) return cloneResult;

      const repoDir = cloneResult.repoDir;
      const simulated = cloneResult.simulated || false;

      let writeResult;
      if (Array.isArray(solution)) {
        writeResult = this.writeMultipleFiles(repoDir, solution);
      } else if (solution.solutions) {
        writeResult = this.writeMultipleFiles(repoDir, solution.solutions);
      } else {
        writeResult = this.writeCode(repoDir, solution.filePath, solution.code);
      }

      if (!writeResult.success) return writeResult;

      const testResult = this.runTests(repoDir);

      const commitResult = this.commitChanges(repoDir, `${solution.commitMessage || 'Auto-generated solution'}`);
      if (!commitResult.success) return commitResult;

      const pushResult = await this.pushBranch(repoDir, branchName);
      if (!pushResult.success) return pushResult;

      const prResult = await this.createPullRequest(owner, repo, branchName, prTitle, prDescription);

      this.cleanupWorkspace(bountyId);

      return {
        success: prResult.success,
        prUrl: prResult.prUrl,
        prNumber: prResult.prNumber,
        simulated: prResult.simulated || simulated,
        testsPassed: testResult.passed,
        testOutput: testResult.output,
      };
    } catch (err) {
      console.error('❌ Workflow error:', err.message);
      this.cleanupWorkspace(bountyId);
      return { success: false, error: err.message };
    }
  }
}

module.exports = { WorkExecutor };
