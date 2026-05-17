const { getThreads, getMessages, getProjectDetails, searchContests } = require('./freelancerAPI');
const { generateAutoReply, analyzeJob } = require('./jobAnalyzer');
const { GitHubScanner } = require('./githubScanner');
const { run, all, get } = require('../db/database');

class JobMonitor {
  constructor() {
    this.isMonitoring = false;
    this.lastCheckTime = null;
    this.checkCount = 0;
    this.githubScanner = new GitHubScanner();
  }

  /**
   * Check for new messages from clients
   */
  async checkNewMessages() {
    try {
      console.log('📬 Checking for new client messages...');

      const { success, threads } = await getThreads();
      if (!success) {
        console.log('⚠️ Failed to fetch threads');
        return { newMessages: 0 };
      }

      let newMessages = 0;

      for (const thread of threads) {
        try {
          const { messages } = await getMessages(thread.id);

          for (const msg of messages) {
            // Skip if message is from us
            if (!msg.from_user || msg.from_user === process.env.FREELANCER_USER_ID) {
              continue;
            }

            // Check if message already stored
            const existing = await get(
              'SELECT id FROM messages WHERE thread_id = ? AND content = ? AND sender = ?',
              [String(thread.id), msg.message || '', msg.from_user]
            );

            if (!existing) {
              // Find associated job by project context or client
              let job = null;

              if (thread.context?.id) {
                job = await get(
                  'SELECT * FROM jobs WHERE external_id = ?',
                  [String(thread.context.id)]
                );
              }

              if (!job && msg.from_user) {
                job = await get(
                  'SELECT * FROM jobs WHERE client_id = ? ORDER BY created_at DESC LIMIT 1',
                  [String(msg.from_user)]
                );
              }

              if (job) {
                const draftReply = generateAutoReply(msg.message, job);

                await run(
                  `INSERT INTO messages (job_id, thread_id, sender, sender_type, content, draft_reply, reply_status)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [
                    job.id,
                    String(thread.id),
                    msg.from_user_name || 'Client',
                    'client',
                    msg.message || '',
                    draftReply,
                    'pending',
                  ]
                );

                newMessages++;

                // Broadcast to dashboard
                if (global.broadcast) {
                  global.broadcast({
                    type: 'NEW_MESSAGE',
                    message: {
                      job_id: job.id,
                      job_title: job.title,
                      sender: msg.from_user_name || 'Client',
                      content: msg.message,
                      draft_reply: draftReply,
                      thread_id: thread.id,
                    },
                  });
                }

                console.log(`📩 New message from ${msg.from_user_name} on job: ${job.title}`);
              }
            }
          }
        } catch (err) {
          console.error(`❌ Error processing thread ${thread.id}:`, err.message);
        }
      }

      if (newMessages > 0) {
        console.log(`✅ Found ${newMessages} new message(s)`);
      }

      return { newMessages };
    } catch (err) {
      console.error('❌ Error checking messages:', err.message);
      return { newMessages: 0, error: err.message };
    }
  }

  /**
   * Check for job awards (when client accepts bid)
   */
  async checkJobAwards() {
    try {
      console.log('🎯 Checking for job awards...');

      // Get all jobs with status APPROVED (bid sent, waiting for client)
      const pendingJobs = await all(
        'SELECT * FROM jobs WHERE status = ? AND external_id IS NOT NULL',
        ['APPROVED']
      );

      let newAwards = 0;

      for (const job of pendingJobs) {
        try {
          const { success, project } = await getProjectDetails(job.external_id);

          if (success && project) {
            // Check if project is awarded to us
            const userId = process.env.FREELANCER_USER_ID;

            // Check bid status
            if (project.bid_stats?.bid_awarded) {
              // Check if we won the bid
              const ourBid = project.bids?.find(bid =>
                String(bid.bidder_id) === String(userId)
              );

              if (ourBid && ourBid.awarded) {
                // Update job status to ACCEPTED
                await run(
                  'UPDATE jobs SET status = ? WHERE id = ?',
                  ['ACCEPTED', job.id]
                );

                newAwards++;

                // Broadcast to dashboard
                if (global.broadcast) {
                  global.broadcast({
                    type: 'JOB_AWARDED',
                    job: {
                      id: job.id,
                      title: job.title,
                      budget: job.budget,
                      client_name: job.client_name,
                      project_url: job.project_url,
                    },
                  });
                }

                console.log(`🎉 Job awarded: ${job.title} ($${job.budget})`);
              }
            }
          }
        } catch (err) {
          console.error(`❌ Error checking job ${job.id}:`, err.message);
        }
      }

      if (newAwards > 0) {
        console.log(`✅ Found ${newAwards} new job award(s)`);
      }

      return { newAwards };
    } catch (err) {
      console.error('❌ Error checking job awards:', err.message);
      return { newAwards: 0, error: err.message };
    }
  }

  /**
   * Auto-scan for contests and save to database
   */
  async autoScanContests() {
    try {
      console.log('🏆 Auto-scanning for contests...');

      const userSkills = [
        'PHP', 'Website Design', 'Graphic Design', 'HTML', 'WordPress',
        'CSS', 'JavaScript', 'User Interface / IA', 'Python', 'Logo Design',
        'Photoshop', 'Illustrator', 'Banner Design', 'PSD to HTML',
        'Landing Pages', 'Web Development', 'Mobile App Development',
        'Android', 'HTML5', 'Adobe InDesign'
      ];

      const designKeywords = [
        'logo design', 'banner design', 'web design', 'flyer design',
        'business card', 'social media design', 'brochure', 'poster',
        'illustration', 'UI design', 'landing page', 'website design',
        'graphic design', 'packaging design', 'brand identity'
      ];

      const { success, contests, total } = await searchContests({
        keywords: designKeywords,
        minBudget: 10,
        maxBudget: 1000,
        limit: 30,
      });

      if (!success) {
        console.log('⚠️ Failed to fetch contests');
        return { newContests: 0 };
      }

      let newContests = 0;
      let autoQueued = 0;

      for (const contest of contests) {
        try {
          // Check if already in database
          const existing = await get(
            'SELECT id FROM jobs WHERE external_id = ?',
            [String(contest.id)]
          );

          if (existing) continue;

          // Check if contest matches user skills
          const contestSkills = (contest.jobs || []).map(j => j.name || '');
          const hasMatchingSkill = contestSkills.some(cs =>
            userSkills.some(us => us.toLowerCase() === cs.toLowerCase())
          );

          if (!hasMatchingSkill && contestSkills.length > 0) continue;

          // Analyze job
          const analysis = analyzeJob({
            title: contest.title || '',
            description: contest.preview_description || contest.description || '',
            budget: contest.budget?.maximum || contest.budget?.minimum || 0,
          });

          // Force job type to contest
          analysis.jobType = {
            type: 'contest',
            isContest: true,
            isFixed: false,
            recommendation: 'Cuộc thi - Tự động phát hiện & sẵn sàng tham gia'
          };

          const jobId = `contest_${contest.id}_${Date.now()}`;
          const budget = contest.budget?.maximum || contest.budget?.minimum || 0;

          await run(
            `INSERT INTO jobs (id, platform, external_id, title, description, budget, currency, skills, status, analysis, is_contest, contest_prize, client_name, client_id, project_url, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
              jobId,
              'freelancer',
              String(contest.id),
              contest.title || 'Untitled Contest',
              contest.preview_description || contest.description || '',
              budget,
              contest.currency?.code || 'USD',
              JSON.stringify(contestSkills),
              'CONTEST_READY',
              JSON.stringify(analysis),
              1,
              budget,
              contest.owner?.username || 'Unknown',
              String(contest.owner?.id || ''),
              `https://www.freelancer.com/contest/${contest.seo_url || contest.id}`,
            ]
          );

          newContests++;
          autoQueued++;

          // Broadcast to dashboard
          if (global.broadcast) {
            global.broadcast({
              type: 'NEW_CONTEST',
              contest: {
                id: jobId,
                title: contest.title,
                budget: budget,
                skills: contestSkills,
                client: contest.owner?.username,
                url: `https://www.freelancer.com/contest/${contest.seo_url || contest.id}`,
                analysis,
              },
            });
          }

          console.log(`🏆 New contest found: ${contest.title} ($${budget})`);
        } catch (err) {
          console.error(`❌ Error processing contest ${contest.id}:`, err.message);
        }
      }

      if (newContests > 0) {
        console.log(`✅ Found ${newContests} new contests (${autoQueued} queued)`);
      } else {
        console.log('ℹ️ No new contests found');
      }

      return { newContests, autoQueued, totalScanned: contests.length };
    } catch (err) {
      console.error('❌ Error scanning contests:', err.message);
      return { newContests: 0, error: err.message };
    }
  }

  /**
   * Auto-scan GitHub, Gitcoin, Algora for bounties
   */
  async autoScanGitHub() {
    try {
      console.log('🐙 Auto-scanning GitHub bounties...');
      const result = await this.githubScanner.scanBounties();
      return { newBounties: result.new || 0, scanned: result.scanned || 0 };
    } catch (err) {
      console.error('❌ Error scanning GitHub bounties:', err.message);
      return { newBounties: 0, error: err.message };
    }
  }

  /**
   * Run full monitoring cycle
   */
  async runMonitoringCycle() {
    if (this.isMonitoring) {
      console.log('⏭️ Monitoring already in progress, skipping...');
      return;
    }

    this.isMonitoring = true;
    this.checkCount++;

    try {
      console.log(`\n🔄 Monitoring cycle #${this.checkCount} started`);

      // Check for new messages
      const { newMessages } = await this.checkNewMessages();

      // Check for job awards
      const { newAwards } = await this.checkJobAwards();

      // Auto-scan for contests
      const { newContests } = await this.autoScanContests();

      // Auto-scan GitHub bounties
      const { newBounties } = await this.autoScanGitHub();

      this.lastCheckTime = new Date();

      console.log(`✅ Monitoring cycle complete: ${newMessages} messages, ${newAwards} awards, ${newContests} contests, ${newBounties} bounties\n`);

      // Broadcast monitoring status
      if (global.broadcast) {
        global.broadcast({
          type: 'MONITORING_UPDATE',
          timestamp: this.lastCheckTime,
          newMessages,
          newAwards,
          newContests,
          newBounties,
          checkCount: this.checkCount,
        });
      }

    } catch (err) {
      console.error('❌ Monitoring cycle error:', err.message);
    } finally {
      this.isMonitoring = false;
    }
  }

  /**
   * Start automatic monitoring
   */
  startAutoMonitoring(intervalMs = 120000) {
    console.log(`🔔 Starting auto-monitoring (every ${intervalMs / 1000}s)`);

    // Run immediately
    this.runMonitoringCycle();

    // Then run on interval
    this.monitoringInterval = setInterval(() => {
      this.runMonitoringCycle();
    }, intervalMs);
  }

  /**
   * Stop automatic monitoring
   */
  stopAutoMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🔕 Auto-monitoring stopped');
    }
  }

  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      lastCheckTime: this.lastCheckTime,
      checkCount: this.checkCount,
    };
  }
}

module.exports = { JobMonitor };
