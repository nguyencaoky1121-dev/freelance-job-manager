const axios = require('axios');

const GITHUB_API_BASE = 'https://api.github.com';
const GITCOIN_API_BASE = 'https://api.gitcoin.co/v0.1';
const ALGORA_API_BASE = 'https://api.algora.io/api';

class GitHubAPI {
  constructor() {
    this.token = process.env.GITHUB_TOKEN || '';
    this.gitcoinKey = process.env.GITCOIN_API_KEY || '';
    this.algoraKey = process.env.ALGORA_API_KEY || '';
  }

  /**
   * Search for GitHub issues with bounty labels/keywords
   */
  async searchBountyIssues(options = {}) {
    const {
      keywords = ['bounty', 'reward', 'paid', 'bug-bounty'],
      minBudget = 10,
      maxBudget = 5000,
      limit = 30,
      offset = 0,
    } = options;

    try {
      if (!this.token) {
        console.log('⚠️ GitHub token not configured - using public search');
      }

      // Build search query - GitHub doesn't support OR in label search
      // Use simple keyword search instead
      const query = 'bounty OR reward OR paid in:title,body is:open is:issue sort:updated-desc';

      const headers = this.token ? {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      } : {
        'Accept': 'application/vnd.github.v3+json',
      };

      const response = await axios.get(`${GITHUB_API_BASE}/search/issues`, {
        params: {
          q: query,
          per_page: limit,
          page: Math.floor(offset / limit) + 1,
        },
        headers,
        timeout: 10000,
      });

      if (response.data && response.data.items) {
        // Filter and enrich issues
        const issues = response.data.items.map(issue => {
          // Extract bounty amount from title/body
          const bountyMatch = (issue.title + ' ' + (issue.body || '')).match(/\$(\d+)/);
          const bountyAmount = bountyMatch ? parseInt(bountyMatch[1]) : 0;

          return {
            id: issue.id,
            number: issue.number,
            title: issue.title,
            description: issue.body || '',
            url: issue.html_url,
            repo: issue.repository_url.split('/').slice(-2).join('/'),
            owner: issue.repository_url.split('/')[4],
            repoName: issue.repository_url.split('/')[5],
            labels: issue.labels.map(l => l.name),
            bountyAmount: bountyAmount,
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            comments: issue.comments,
            platform: 'github',
          };
        });

        return {
          success: true,
          issues,
          total: response.data.total_count,
        };
      }

      return { success: true, issues: [], total: 0 };
    } catch (error) {
      console.error('❌ Error searching GitHub issues:', error.message);
      return {
        success: false,
        error: error.message,
        issues: [],
        total: 0,
      };
    }
  }

  /**
   * Get issue details with comments
   */
  async getIssueDetails(owner, repo, issueNumber) {
    try {
      const headers = this.token ? {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      } : {
        'Accept': 'application/vnd.github.v3+json',
      };

      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}`,
        { headers, timeout: 10000 }
      );

      return {
        success: true,
        issue: response.data,
      };
    } catch (error) {
      console.error(`❌ Error getting issue ${owner}/${repo}#${issueNumber}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Post comment on GitHub issue
   */
  async postComment(owner, repo, issueNumber, comment) {
    try {
      if (!this.token) {
        return {
          success: false,
          error: 'GitHub token required to post comments',
        };
      }

      const response = await axios.post(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
        { body: comment },
        {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        comment: response.data,
      };
    } catch (error) {
      console.error(`❌ Error posting comment on ${owner}/${repo}#${issueNumber}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Search Gitcoin bounties via GitHub (Gitcoin uses GitHub issues)
   * Searches multiple queries to find more bounties
   */
  async searchGitcoinBounties(options = {}) {
    const {
      limit = 30,
    } = options;

    try {
      const headers = this.token ? {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      } : {
        'Accept': 'application/vnd.github.v3+json',
      };

      // Multiple search queries to find Gitcoin bounties
      const queries = [
        'label:gitcoin-bounty is:open is:issue sort:updated-desc',
        'label:gitcoin is:open is:issue bounty sort:updated-desc',
        'label:bounty label:gitcoin is:open is:issue sort:updated-desc',
        'label:reward label:gitcoin is:open is:issue sort:updated-desc',
      ];

      const allBounties = [];
      const seenIds = new Set();

      for (const query of queries) {
        try {
          const response = await axios.get(`${GITHUB_API_BASE}/search/issues`, {
            params: {
              q: query,
              per_page: limit,
              page: 1,
            },
            headers,
            timeout: 10000,
          });

          if (response.data && response.data.items) {
            for (const issue of response.data.items) {
              if (seenIds.has(issue.id)) continue;
              seenIds.add(issue.id);

              const bountyMatch = (issue.title + ' ' + (issue.body || '')).match(/\$(\d+)/);
              const bountyAmount = bountyMatch ? parseInt(bountyMatch[1]) : 0;

              allBounties.push({
                id: issue.id,
                number: issue.number,
                title: issue.title,
                description: issue.body || '',
                url: issue.html_url,
                repo: issue.repository_url.split('/').slice(-2).join('/'),
                owner: issue.repository_url.split('/')[4],
                repoName: issue.repository_url.split('/')[5],
                bountyAmount,
                platform: 'gitcoin',
                createdAt: issue.created_at,
                updatedAt: issue.updated_at,
              });
            }
          }
        } catch (err) {
          console.log(`⚠️ Query failed: ${query.substring(0, 30)}...`);
        }
      }

      return {
        success: true,
        bounties: allBounties,
        total: allBounties.length,
      };
    } catch (error) {
      console.error('❌ Error searching Gitcoin bounties:', error.message);
      return {
        success: false,
        error: error.message,
        bounties: [],
        total: 0,
      };
    }
  }

  /**
   * Search Algora bounties via GitHub (Algora uses GitHub issues)
   * Searches multiple queries to find more bounties
   */
  async searchAlgoraBounties(options = {}) {
    const {
      limit = 30,
    } = options;

    try {
      const headers = this.token ? {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      } : {
        'Accept': 'application/vnd.github.v3+json',
      };

      // Multiple search queries to find Algora bounties
      const queries = [
        'label:algora-bounty is:open is:issue sort:updated-desc',
        'repo:algora-io/algora is:open is:issue bounty sort:updated-desc',
        'label:bounty repo:algora-io is:open is:issue sort:updated-desc',
        'label:reward repo:algora-io is:open is:issue sort:updated-desc',
      ];

      const allBounties = [];
      const seenIds = new Set();

      for (const query of queries) {
        try {
          const response = await axios.get(`${GITHUB_API_BASE}/search/issues`, {
            params: {
              q: query,
              per_page: limit,
              page: 1,
            },
            headers,
            timeout: 10000,
          });

          if (response.data && response.data.items) {
            for (const issue of response.data.items) {
              if (seenIds.has(issue.id)) continue;
              seenIds.add(issue.id);

              const bountyMatch = (issue.title + ' ' + (issue.body || '')).match(/\$(\d+)/);
              const bountyAmount = bountyMatch ? parseInt(bountyMatch[1]) : 0;

              allBounties.push({
                id: issue.id,
                number: issue.number,
                title: issue.title,
                description: issue.body || '',
                url: issue.html_url,
                repo: issue.repository_url.split('/').slice(-2).join('/'),
                owner: issue.repository_url.split('/')[4],
                repoName: issue.repository_url.split('/')[5],
                bountyAmount,
                platform: 'algora',
                createdAt: issue.created_at,
                updatedAt: issue.updated_at,
              });
            }
          }
        } catch (err) {
          console.log(`⚠️ Query failed: ${query.substring(0, 30)}...`);
        }
      }

      return {
        success: true,
        bounties: allBounties,
        total: allBounties.length,
      };
    } catch (error) {
      console.error('❌ Error searching Algora bounties:', error.message);
      return {
        success: false,
        error: error.message,
        bounties: [],
        total: 0,
      };
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile() {
    try {
      if (!this.token) {
        return {
          success: false,
          error: 'GitHub token required',
        };
      }

      const response = await axios.get(`${GITHUB_API_BASE}/user`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        timeout: 10000,
      });

      return {
        success: true,
        user: response.data,
      };
    } catch (error) {
      console.error('❌ Error getting user profile:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(owner, repo, head, base, title, body) {
    try {
      if (!this.token) {
        return {
          success: false,
          error: 'GitHub token required to create PR',
        };
      }

      const response = await axios.post(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls`,
        {
          title,
          body,
          head,
          base,
        },
        {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        pr: response.data,
      };
    } catch (error) {
      console.error(`❌ Error creating PR on ${owner}/${repo}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get PR details
   */
  async getPRDetails(owner, repo, prNumber) {
    try {
      const headers = this.token ? {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      } : {
        'Accept': 'application/vnd.github.v3+json',
      };

      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`,
        { headers, timeout: 10000 }
      );

      return {
        success: true,
        pr: response.data,
      };
    } catch (error) {
      console.error(`❌ Error getting PR ${owner}/${repo}#${prNumber}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get PR reviews
   */
  async getPRReviews(owner, repo, prNumber) {
    try {
      const headers = this.token ? {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      } : {
        'Accept': 'application/vnd.github.v3+json',
      };

      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
        { headers, timeout: 10000 }
      );

      return {
        success: true,
        reviews: response.data,
      };
    } catch (error) {
      console.error(`❌ Error getting PR reviews ${owner}/${repo}#${prNumber}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get issue comments
   */
  async getIssueComments(owner, repo, issueNumber) {
    try {
      const headers = this.token ? {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      } : {
        'Accept': 'application/vnd.github.v3+json',
      };

      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
        { headers, timeout: 10000 }
      );

      return {
        success: true,
        comments: response.data || [],
      };
    } catch (error) {
      console.error(`❌ Error getting issue comments ${owner}/${repo}#${issueNumber}:`, error.message);
      return {
        success: false,
        error: error.message,
        comments: [],
      };
    }
  }

  /**
   * Get repository content
   */
  async getRepoContent(owner, repo, path = '') {
    try {
      const headers = this.token ? {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      } : {
        'Accept': 'application/vnd.github.v3+json',
      };

      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
        { headers, timeout: 10000 }
      );

      return {
        success: true,
        content: response.data,
      };
    } catch (error) {
      console.error(`❌ Error getting repo content ${owner}/${repo}/${path}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Fork repository
   */
  async forkRepository(owner, repo) {
    try {
      if (!this.token) {
        return {
          success: false,
          error: 'GitHub token required to fork repository',
        };
      }

      const response = await axios.post(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/forks`,
        {},
        {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        fork: response.data,
      };
    } catch (error) {
      console.error(`❌ Error forking ${owner}/${repo}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  /**
   * Check if a bounty issue is already solved or has winners
   */
  async checkBountyStatus(owner, repo, issueNumber) {
    try {
      if (!this.token) {
        return { solved: false, competitionLevel: 0, canAttempt: true };
      }

      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
        {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          timeout: 10000,
        }
      );

      const comments = response.data || [];

      // Look for Algora bot or similar rewarding comments
      const hasWinner = comments.some(comment => {
        const username = comment.user?.login || '';
        const body = comment.body || '';

        return (username.includes('algora') || username.includes('bot')) &&
               (body.includes('Rewarded') || body.includes('claimed') || body.includes('Reward'));
      });

      // Check for /attempt commands to see competition level
      const attempts = comments.filter(c => (c.body || '').toLowerCase().includes('/attempt')).length;

      return {
        solved: hasWinner,
        competitionLevel: attempts,
        canAttempt: !hasWinner && attempts < 5 // Avoid highly contested ones if too many attempts
      };
    } catch (err) {
      console.error(`❌ Error checking bounty status for ${owner}/${repo}#${issueNumber}: ${err.message}`);
      // Default to allowing attempt if check fails, but log it
      return { solved: false, competitionLevel: 0, canAttempt: true, error: err.message };
    }
  }

  /**
   * Send /attempt command to register for a bounty
   */
  async attemptBounty(owner, repo, issueNumber, plan = '') {
    const comment = `/attempt #${issueNumber}\n\n**Implementation Plan:**\n${plan || 'Analyzing requirements and implementing a clean solution according to acceptance criteria.'}`;
    return await this.postComment(owner, repo, issueNumber, comment);
  }
}

module.exports = { GitHubAPI };
