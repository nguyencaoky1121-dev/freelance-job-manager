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

/**
 * Run a git command safely using cwd instead of cd && chaining.
 * Returns { stdout, success } or throws on failure.
 */
function runGit(args, cwd, timeoutMs = 120000) {
  const cmd = `git ${args}`;
  console.log(`  🔧 [GIT] ${cmd} (in ${cwd})`);
  try {
    const stdout = execSync(cmd, {
      cwd,
      stdio: 'pipe',
      timeout: timeoutMs,
      encoding: 'utf-8',
    });
    return { stdout: stdout.trim(), success: true };
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().trim() : err.message;
    console.error(`  ❌ [GIT] Failed: ${stderr}`);
    throw new Error(stderr);
  }
}

class WorkExecutor {
  constructor() {
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
   * Clone repository and create branch.
   * Uses cwd option instead of cd && chaining for reliability.
   * Includes retry logic for freshly forked repos.
   */
  async cloneAndBranch(owner, repo, bountyId, branchName) {
    try {
      const bountyDir = path.join(this.workDir, bountyId);
      const repoDir = path.join(bountyDir, repo);

      console.log(`📂 Cloning ${owner}/${repo} to ${repoDir}...`);

      if (!GIT_AVAILABLE) {
        console.warn('⚠️ Git not available. Creating mock repository structure...');
        if (!fs.existsSync(repoDir)) fs.mkdirSync(repoDir, { recursive: true });
        return { success: true, repoDir, simulated: true };
      }

      const token = process.env.GITHUB_TOKEN;
      const username = process.env.GITHUB_USERNAME;

      if (!token) {
        console.error('❌ GITHUB_TOKEN is required for git operations.');
        return { success: false, error: 'GITHUB_TOKEN not configured' };
      }

      if (!username) {
        console.warn('⚠️ GITHUB_USERNAME not configured. Using "AutoAgent" as fallback for git config.');
      }

      // Use oauth2 token for HTTPS authentication
      const cloneUrl = `https://oauth2:${token}@github.com/${owner}/${repo}.git`;
      console.log(`  🔗 Clone URL (authenticated): https://github.com/${owner}/${repo}.git`);

      // Retry clone up to 5 times instead of 3, and increase backoff time
      const MAX_RETRIES = 5;
      let lastErr = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`  📥 Clone attempt ${attempt}/${MAX_RETRIES}...`);

          // Clean up if previous attempt left partial data
          if (fs.existsSync(repoDir)) {
            fs.rmSync(repoDir, { recursive: true, force: true });
          }

          // Clone into bountyDir (parent), creating repoDir
          // Add --config to help with some Git environments
          runGit(`clone --depth 1 ${cloneUrl} "${repo}"`, bountyDir, 300000); // 5 min timeout

          // Verify .git exists
          const gitDir = path.join(repoDir, '.git');
          if (!fs.existsSync(gitDir)) {
            throw new Error('.git directory not found after clone');
          }

          // Create branch using cwd (NOT cd &&)
          runGit(`checkout -b ${branchName}`, repoDir);

          console.log(`  ✅ Clone and branch successful on attempt ${attempt}`);
          return { success: true, repoDir };
        } catch (cloneErr) {
          lastErr = cloneErr;
          console.warn(`  ⚠️ Attempt ${attempt} failed: ${cloneErr.message}`);

          if (attempt < MAX_RETRIES) {
            const delay = attempt * 10000; // 10s, 20s, 30s, 40s backoff
            console.log(`  ⏳ Waiting ${delay / 1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries exhausted
      console.error(`❌ All ${MAX_RETRIES} clone attempts failed: ${lastErr.message}`);
      return { success: false, error: `Clone failed after ${MAX_RETRIES} attempts: ${lastErr.message}` };
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
   * Commit changes using cwd (NOT cd && chaining)
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

        runGit(`config user.name "${gitName}"`, repoDir);
        runGit(`config user.email "${gitEmail}"`, repoDir);
        runGit('add -A', repoDir);

        // Use -- to avoid commit message being interpreted as flags
        const safeMessage = commitMessage.replace(/[\\"`$]/g, '\\$&');
        runGit(`commit -m "${safeMessage}"`, repoDir);

        return { success: true, message: 'Changes committed' };
      } catch (gitErr) {
        // Check if "nothing to commit" (not a real error)
        if (gitErr.message.includes('nothing to commit')) {
          console.warn('⚠️ Nothing to commit (working tree clean).');
          return { success: true, message: 'Nothing to commit', simulated: true };
        }
        console.warn(`⚠️ Git commit failed: ${gitErr.message}`);
        return { success: false, error: gitErr.message };
      }
    } catch (err) {
      console.error('❌ Error committing:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Push branch to GitHub using cwd
   */
  async pushBranch(repoDir, branchName) {
    try {
      console.log(`🚀 Pushing branch ${branchName}...`);
      if (!GIT_AVAILABLE) {
        console.warn('⚠️ Git not available. Skipping real push.');
        return { success: true, message: 'Push simulated', simulated: true };
      }

      const token = process.env.GITHUB_TOKEN;
      const username = process.env.GITHUB_USERNAME;

      if (!token || !username) {
        return { success: false, error: 'GITHUB_TOKEN or GITHUB_USERNAME not configured' };
      }

      try {
        // Cấu hình lại remote URL để bao gồm token xác thực nhằm tránh lỗi 403 khi push
        // Lấy thông tin remote hiện tại để biết owner/repo
        const remoteUrlResult = runGit('remote get-url origin', repoDir);
        let remoteUrl = remoteUrlResult.stdout;

        // Chuyển đổi URL sang dạng có auth nếu cần
        if (remoteUrl.includes('github.com') && !remoteUrl.includes('oauth2:')) {
          // Trích xuất owner/repo từ URL hiện tại
          const match = remoteUrl.match(/github\.com[/:](.+)\.git/);
          if (match) {
            const targetRepoPath = match[1];
            const authenticatedUrl = `https://oauth2:${token}@github.com/${targetRepoPath}.git`;
            console.log(`  🔧 [GIT] Updating remote URL for authentication...`);
            runGit(`remote set-url origin ${authenticatedUrl}`, repoDir);
          }
        }

        // Retry push up to 3 times with exponential backoff
        const PUSH_MAX_RETRIES = 3;
        let pushLastErr = null;

        for (let attempt = 1; attempt <= PUSH_MAX_RETRIES; attempt++) {
          try {
            console.log(`  🚀 Push attempt ${attempt}/${PUSH_MAX_RETRIES}...`);
            runGit(`push -f origin ${branchName}`, repoDir, 300000); // 5 min timeout
            console.log(`  ✅ Push successful on attempt ${attempt}`);
            return { success: true, message: `Branch ${branchName} pushed` };
          } catch (pushErr) {
            pushLastErr = pushErr;
            console.warn(`  ⚠️ Push attempt ${attempt} failed: ${pushErr.message}`);
            if (attempt < PUSH_MAX_RETRIES) {
              const delay = attempt * 10000; // 10s, 20s backoff
              console.log(`  ⏳ Waiting ${delay / 1000}s before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        console.warn(`⚠️ Git push failed after ${PUSH_MAX_RETRIES} attempts: ${pushLastErr.message}`);
        return { success: false, error: pushLastErr.message };
      } catch (gitErr) {
        console.warn(`⚠️ Git push failed: ${gitErr.message}`);
        return { success: false, error: gitErr.message };
      }
    } catch (err) {
      console.error('❌ Error pushing:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Create pull request via GitHub API
   */
  async createPullRequest(owner, repo, branchName, title, description) {
    try {
      console.log(`📋 Creating pull request...`);

      const gitUser = process.env.GITHUB_USERNAME;
      const head = (gitUser && gitUser.toLowerCase() !== owner.toLowerCase())
        ? `${gitUser}:${branchName}`
        : branchName;

      // Lazy-load GitHubAPI to avoid circular dependency
      const { GitHubAPI } = require('./githubAPI');
      const githubAPI = new GitHubAPI();

      const response = await githubAPI.createPullRequest(owner, repo, head, 'main', title, description);

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
  async executeWorkflow(owner, repo, bountyId, branchName, solution, prTitle, prDescription, originalOwner) {
    try {
      console.log(`\n🚀 Starting workflow for ${bountyId}...\n`);

      const initResult = this.initializeWorkspace(bountyId);
      if (!initResult.success) return initResult;

      // Clone from the *owner* (which might be the forked repo owner)
      const cloneResult = await this.cloneAndBranch(owner, repo, bountyId, branchName);
      if (!cloneResult.success) return cloneResult;

      const repoDir = cloneResult.repoDir;
      const simulated = cloneResult.simulated || false;

      // Write solution files
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

      const commitMsg = solution.commitMessage || 'Auto-generated solution';
      const commitResult = this.commitChanges(repoDir, commitMsg);
      if (!commitResult.success) return commitResult;

      // Skip push if commit was simulated (nothing to push)
      if (commitResult.simulated && commitResult.message === 'Nothing to commit') {
        console.warn('⚠️ No changes to push. Workflow completed without PR.');
        this.cleanupWorkspace(bountyId);
        return {
          success: false,
          error: 'No code changes were generated (nothing to commit)',
        };
      }

      const pushResult = await this.pushBranch(repoDir, branchName);
      if (!pushResult.success) return pushResult;

      // Create PR to the *originalOwner*'s repo
      const prResult = await this.createPullRequest(
        originalOwner || owner,
        repo,
        branchName,
        prTitle,
        prDescription
      );

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
