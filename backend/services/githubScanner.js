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
            const bountyBudget = issue.bountyAmount || 0;

            if (bountyBudget <= 0) {
              results.skipped++;
              continue; /* Bỏ qua hoàn toàn bounty không xác định được ngân sách ngay từ bước quét */
            }

            let status = 'SCANNED';
            let autoTrigger = false;

            // Tự động phân tích và sẵn sàng nộp nếu bounty dưới $100
            if (bountyBudget <= 100) {
              status = 'ANALYZED';
              autoTrigger = true;
              console.log(`🤖 Auto-trigger enabled for low-budget GitHub bounty: ${issue.title} ($${bountyBudget})`);
              if (global.sysLog) {
                global.sysLog(`🤖 Tự động phát hiện Bounty GitHub phù hợp (Dưới $100): ${issue.title} ($${bountyBudget}) - Xếp hàng chờ xử lý tự động`, 'AUTOWORK_INFO');
              }
            }

            await run(
              `INSERT INTO jobs (id, platform, external_id, title, description, budget, currency, skills, status, analysis, client_name, client_id, project_url, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                jobId,
                'github',
                String(issue.id),
                issue.title,
                issue.description,
                bountyBudget,
                'USD',
                JSON.stringify(issue.labels),
                status,
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
                  status: status
                },
              });
            }

            // Kích hoạt xử lý tự động ngầm nếu thỏa mãn điều kiện dưới $100
            if (autoTrigger && global.autoworkPipeline && typeof global.autoworkPipeline.postAttemptOnly === 'function') {
               // Chạy bất đồng bộ, không chờ đợi kết quả để tránh chặn quá trình quét
               setTimeout(() => {
                 console.log(`⚙️ Tự động kích hoạt pipeline xử lý One-Shot cho job: ${jobId}`);
                 if (global.sysLog) {
                   global.sysLog(`🚀 Tự động nộp bài và viết code cho Bounty dưới $100: ${issue.title}`, 'AUTOWORK_START');
                 }
                 global.autoworkPipeline.postAttemptOnly(jobId).catch(err => {
                   console.error(`❌ Auto-trigger failed for ${jobId}: ${err.message}`);
                 });
               }, 1000); // Đợi 1 giây đảm bảo database đã insert xong
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
            const bountyBudget = bounty.bountyAmount || 0;

            if (bountyBudget <= 0) {
              results.skipped++;
              continue;
            }

            let status = 'SCANNED';
            let autoTrigger = false;

            if (bountyBudget <= 100) {
              status = 'ANALYZED';
              autoTrigger = true;
              if (global.sysLog) {
                global.sysLog(`🤖 Tự động phát hiện Bounty Gitcoin (Dưới $100): ${bounty.title} ($${bountyBudget})`, 'AUTOWORK_INFO');
              }
            }

            await run(
              `INSERT INTO jobs (id, platform, external_id, title, description, budget, currency, status, analysis, client_name, project_url, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                jobId,
                'gitcoin',
                String(bounty.id),
                bounty.title,
                bounty.description,
                bountyBudget,
                'USD',
                status,
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
                  status: status
                },
              });
            }

            if (autoTrigger && global.autoworkPipeline && typeof global.autoworkPipeline.postAttemptOnly === 'function') {
               setTimeout(() => {
                 if (global.sysLog) {
                   global.sysLog(`🚀 Tự động nộp bài cho Bounty Gitcoin: ${bounty.title}`, 'AUTOWORK_START');
                 }
                 global.autoworkPipeline.postAttemptOnly(jobId).catch(err => {
                   console.error(`❌ Auto-trigger failed for ${jobId}: ${err.message}`);
                 });
               }, 1500);
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
            const bountyBudget = bounty.bountyAmount || 0;

            if (bountyBudget <= 0) {
              results.skipped++;
              continue;
            }

            let status = 'SCANNED';
            let autoTrigger = false;

            if (bountyBudget <= 100) {
              status = 'ANALYZED';
              autoTrigger = true;
              if (global.sysLog) {
                global.sysLog(`🤖 Tự động phát hiện Bounty Algora (Dưới $100): ${bounty.title} ($${bountyBudget})`, 'AUTOWORK_INFO');
              }
            }

            await run(
              `INSERT INTO jobs (id, platform, external_id, title, description, budget, currency, status, analysis, client_name, project_url, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                jobId,
                'algora',
                String(bounty.id),
                bounty.title,
                bounty.description,
                bountyBudget,
                'USD',
                status,
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
                  status: status
                },
              });
            }

            if (autoTrigger && global.autoworkPipeline && typeof global.autoworkPipeline.postAttemptOnly === 'function') {
               setTimeout(() => {
                 if (global.sysLog) {
                   global.sysLog(`🚀 Tự động nộp bài cho Bounty Algora: ${bounty.title}`, 'AUTOWORK_START');
                 }
                 global.autoworkPipeline.postAttemptOnly(jobId).catch(err => {
                   console.error(`❌ Auto-trigger failed for ${jobId}: ${err.message}`);
                 });
               }, 2000);
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
