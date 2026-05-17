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
}

module.exports = { GitHubAPI };
