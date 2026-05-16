const { getThreads, getMessages, getProjectDetails } = require('./freelancerAPI');
const { generateAutoReply } = require('./jobAnalyzer');
const { run, all, get } = require('../db/database');

class JobMonitor {
  constructor() {
    this.isMonitoring = false;
    this.lastCheckTime = null;
    this.checkCount = 0;
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

      this.lastCheckTime = new Date();

      console.log(`✅ Monitoring cycle complete: ${newMessages} messages, ${newAwards} awards\n`);

      // Broadcast monitoring status
      if (global.broadcast) {
        global.broadcast({
          type: 'MONITORING_UPDATE',
          timestamp: this.lastCheckTime,
          newMessages,
          newAwards,
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
