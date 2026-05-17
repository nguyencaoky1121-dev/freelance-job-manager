const { GitHubAPI } = require('./githubAPI');
const { analyzeJob } = require('./jobAnalyzer');
const { run, all, get } = require('../db/database');

class GitHubScanner {
  constructor() {
    this.githubAPI = new GitHubAPI();
    this.isScanning = false;
    this.lastScanTime = null;
    this.scanCount = 0;
  }

  /**
   * Scan GitHub for bounty opportunities
   */
  async scanBounties(options = {}) {
    if (this.isScanning) {
      console.log('⏭️ GitHub scan already in progress, skipping...');
      return { success: false, message: 'Scan already in progress' };
    }

    this.isScanning = true;
    const results = { scanned: 0, new: 0, analyzed: 0, skipped: 0, errors: [] };

    try {
      console.log('🔍 Starting GitHub bounty scan...');

      // Design-related keywords for filtering
      const designKeywords = [
        'design', 'ui', 'ux', 'frontend', 'web design',
        'logo', 'banner', 'illustration', 'graphic',
        'css', 'html', 'react', 'vue', 'angular'
      ];

      // Search GitHub issues with bounty labels
      const { success: ghSuccess, issues, total: ghTotal, error: ghError } = await this.githubAPI.searchBountyIssues({
        keywords: designKeywords,
        minBudget: 10,
        maxBudget: 5000,
        limit: 30,
      });

      if (!ghSuccess) {
        results.errors.push(`GitHub search failed: ${ghError}`);
        console.log('⚠️ GitHub search failed:', ghError);
      } else {
        console.log(`📋 Found ${issues.length} GitHub bounties (total: ${ghTotal})`);
        results.scanned += issues.length;

        for (const issue of issues) {
          try {
            // Check if already exists
            const existing = await get(
              'SELECT id FROM jobs WHERE external_id = ? AND platform = ?',
              [String(issue.id), 'github']
            );

            if (existing) {
              results.skipped++;
              continue;
            }

            // Filter by design relevance
            const isDesignRelated = designKeywords.some(kw =>
              (issue.title + ' ' + issue.description).toLowerCase().includes(kw)
            );

            if (!isDesignRelated && issue.labels.length === 0) {
              results.skipped++;
              continue;
            }

            // Analyze the bounty
            const analysis = analyzeJob({
              title: issue.title,
              description: issue.description,
              budget: issue.bountyAmount || 0,
            });

            // Force job type to bounty
            analysis.jobType = {
              type: 'bounty',
              isBounty: true,
              isFixed: false,
              recommendation: 'GitHub Bounty - Tự động phát hiện & sẵn sàng tham gia'
            };

            const jobId = `github_${issue.id}_${Date.now()}`;

            await run(
              `INSERT INTO jobs (id, platform, external_id, title, description, budget, currency, skills, status, analysis, client_name, client_id, project_url, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                jobId,
                'github',
                String(issue.id),
                issue.title,
                issue.description,
                issue.bountyAmount || 0,
                'USD',
                JSON.stringify(issue.labels),
                'SCANNED',
                JSON.stringify(analysis),
                issue.owner || 'Unknown',
                String(issue.id),
                issue.url,
              ]
            );

            results.new++;
            results.analyzed++;

            // Broadcast to dashboard
            if (global.broadcast) {
              global.broadcast({
                type: 'NEW_GITHUB_BOUNTY',
                bounty: {
                  id: jobId,
                  title: issue.title,
                  budget: issue.bountyAmount || 0,
                  labels: issue.labels,
                  repo: issue.repo,
                  url: issue.url,
                  analysis,
                },
              });
            }

            console.log(`🏆 New GitHub bounty found: ${issue.title} ($${issue.bountyAmount || 0})`);
          } catch (err) {
            results.errors.push(`Issue ${issue.id}: ${err.message}`);
            console.error(`❌ Error processing GitHub issue ${issue.id}:`, err.message);
          }
        }
      }

      // Search Gitcoin bounties
      const { success: gcSuccess, bounties: gcBounties, error: gcError } = await this.githubAPI.searchGitcoinBounties({
        keywords: designKeywords,
        minBudget: 10,
        maxBudget: 5000,
        limit: 20,
      });

      if (!gcSuccess) {
        console.log('⚠️ Gitcoin search failed:', gcError);
      } else {
        console.log(`📋 Found ${gcBounties.length} Gitcoin bounties`);
        results.scanned += gcBounties.length;

        for (const bounty of gcBounties) {
          try {
            const existing = await get(
              'SELECT id FROM jobs WHERE external_id = ? AND platform = ?',
              [String(bounty.id), 'gitcoin']
            );

            if (existing) {
              results.skipped++;
              continue;
            }

            const analysis = analyzeJob({
              title: bounty.title,
              description: bounty.description,
              budget: bounty.bountyAmount || 0,
            });

            analysis.jobType = {
              type: 'bounty',
              isBounty: true,
              platform: 'gitcoin',
              recommendation: 'Gitcoin Bounty - Open-source rewards'
            };

            const jobId = `gitcoin_${bounty.id}_${Date.now()}`;

            await run(
              `INSERT INTO jobs (id, platform, external_id, title, description, budget, currency, status, analysis, client_name, project_url, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                jobId,
                'gitcoin',
                String(bounty.id),
                bounty.title,
                bounty.description,
                bounty.bountyAmount || 0,
                'USD',
                'SCANNED',
                JSON.stringify(analysis),
                'Gitcoin',
                bounty.url,
              ]
            );

            results.new++;
            results.analyzed++;

            if (global.broadcast) {
              global.broadcast({
                type: 'NEW_GITCOIN_BOUNTY',
                bounty: {
                  id: jobId,
                  title: bounty.title,
                  budget: bounty.bountyAmount || 0,
                  url: bounty.url,
                  analysis,
                },
              });
            }

            console.log(`🏆 New Gitcoin bounty found: ${bounty.title} ($${bounty.bountyAmount || 0})`);
          } catch (err) {
            results.errors.push(`Gitcoin ${bounty.id}: ${err.message}`);
          }
        }
      }

      // Search Algora bounties
      const { success: alSuccess, bounties: alBounties, error: alError } = await this.githubAPI.searchAlgoraBounties({
        keywords: designKeywords,
        minBudget: 10,
        maxBudget: 5000,
        limit: 20,
      });

      if (!alSuccess) {
        console.log('⚠️ Algora search failed:', alError);
      } else {
        console.log(`📋 Found ${alBounties.length} Algora bounties`);
        results.scanned += alBounties.length;

        for (const bounty of alBounties) {
          try {
            const existing = await get(
              'SELECT id FROM jobs WHERE external_id = ? AND platform = ?',
              [String(bounty.id), 'algora']
            );

            if (existing) {
              results.skipped++;
              continue;
            }

            const analysis = analyzeJob({
              title: bounty.title,
              description: bounty.description,
              budget: bounty.bountyAmount || 0,
            });

            analysis.jobType = {
              type: 'bounty',
              isBounty: true,
              platform: 'algora',
              recommendation: 'Algora Bounty - GitHub issue rewards'
            };

            const jobId = `algora_${bounty.id}_${Date.now()}`;

            await run(
              `INSERT INTO jobs (id, platform, external_id, title, description, budget, currency, status, analysis, client_name, project_url, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                jobId,
                'algora',
                String(bounty.id),
                bounty.title,
                bounty.description,
                bounty.bountyAmount || 0,
                'USD',
                'SCANNED',
                JSON.stringify(analysis),
                'Algora',
                bounty.url,
              ]
            );

            results.new++;
            results.analyzed++;

            if (global.broadcast) {
              global.broadcast({
                type: 'NEW_ALGORA_BOUNTY',
                bounty: {
                  id: jobId,
                  title: bounty.title,
                  budget: bounty.bountyAmount || 0,
                  url: bounty.url,
                  analysis,
                },
              });
            }

            console.log(`🏆 New Algora bounty found: ${bounty.title} ($${bounty.bountyAmount || 0})`);
          } catch (err) {
            results.errors.push(`Algora ${bounty.id}: ${err.message}`);
          }
        }
      }

      this.lastScanTime = new Date();
      this.scanCount++;

      console.log(`✅ GitHub scan complete: ${results.new} new bounties, ${results.analyzed} analyzed, ${results.skipped} skipped`);

      if (global.broadcast) {
        global.broadcast({
          type: 'GITHUB_SCAN_COMPLETE',
          results,
          timestamp: this.lastScanTime,
        });
      }

    } catch (err) {
      results.errors.push(err.message);
      console.error('❌ GitHub scan error:', err.message);
    }

    this.isScanning = false;
    return { success: true, ...results };
  }

  /**
   * Check for updates on existing bounties
   */
  async checkBountyUpdates() {
    try {
      console.log('🔄 Checking for bounty updates...');

      // Get all pending GitHub bounties
      const pendingBounties = await all(
        'SELECT * FROM jobs WHERE platform IN (?, ?, ?) AND status = ?',
        ['github', 'gitcoin', 'algora', 'SCANNED']
      );

      let updates = 0;

      for (const bounty of pendingBounties) {
        try {
          if (bounty.platform === 'github') {
            // Check if issue is still open
            const parts = bounty.project_url.split('/');
            const owner = parts[3];
            const repo = parts[4];
            const issueNumber = parts[6];

            const { success, issue } = await this.githubAPI.getIssueDetails(owner, repo, issueNumber);

            if (success && issue && issue.state === 'closed') {
              // Issue closed, update status
              await run(
                'UPDATE jobs SET status = ? WHERE id = ?',
                ['COMPLETED', bounty.id]
              );
              updates++;
            }
          }
        } catch (err) {
          console.error(`❌ Error checking bounty ${bounty.id}:`, err.message);
        }
      }

      if (updates > 0) {
        console.log(`✅ Found ${updates} bounty updates`);
      }

      return { updates };
    } catch (err) {
      console.error('❌ Error checking bounty updates:', err.message);
      return { updates: 0, error: err.message };
    }
  }

  getStatus() {
    return {
      isScanning: this.isScanning,
      lastScanTime: this.lastScanTime,
      scanCount: this.scanCount,
    };
  }
}

module.exports = { GitHubScanner };
