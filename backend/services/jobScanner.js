const { searchProjects, getProjectDetails, getThreads, getMessages } = require('./freelancerAPI');
const { analyzeJob, generateAutoReply } = require('./jobAnalyzer');
const { run, all, get } = require('../db/database');

class JobScanner {
  constructor() {
    this.isScanning = false;
    this.lastScanTime = null;
    this.scanCount = 0;
  }

  /**
   * Scan for new design jobs
   */
  async scanJobs(keywords = null) {
    if (this.isScanning) {
      return { success: false, message: 'Scan already in progress' };
    }

    this.isScanning = true;
    const results = { scanned: 0, new: 0, analyzed: 0, errors: [] };

    try {
      console.log('🔍 Starting job scan...');

      const searchOptions = {};
      if (keywords) {
        searchOptions.keywords = Array.isArray(keywords) ? keywords : [keywords];
      }

      const { success, projects, total, error } = await searchProjects(searchOptions);

      if (!success) {
        results.errors.push(error);
        this.isScanning = false;
        return { success: false, ...results };
      }

      console.log(`📋 Found ${projects.length} projects (total: ${total})`);
      results.scanned = projects.length;

      for (const project of projects) {
        try {
          // Check if already exists
          const existing = await get('SELECT id FROM jobs WHERE external_id = ? AND platform = ?', [
            String(project.id),
            'freelancer',
          ]);

          if (existing) continue;

          // Map project to our format
          const job = {
            id: `fl-${project.id}-${Date.now()}`,
            platform: 'freelancer',
            external_id: String(project.id),
            title: project.title || 'Untitled',
            description: project.preview_description || project.description || '',
            budget: project.budget?.minimum || project.budget?.average || 0,
            currency: project.currency?.code || 'USD',
            skills: JSON.stringify(project.jobs?.map(j => j.name) || []),
            client_name: project.owner?.username || 'Unknown',
            client_id: String(project.owner?.id || ''),
            project_url: `https://www.freelancer.com/projects/${project.seo_url || project.id}`,
            bidCount: project.bid_stats?.bid_count || 0,
          };

          // Analyze the job
          const analysis = analyzeJob(job);

          // Save to database
          await run(
            `INSERT INTO jobs (id, platform, external_id, title, description, budget, currency, skills, status, analysis, proposal, client_name, client_id, project_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              job.id, job.platform, job.external_id, job.title, job.description,
              job.budget, job.currency, job.skills, 'ANALYZED',
              JSON.stringify(analysis), analysis.proposal,
              job.client_name, job.client_id, job.project_url,
            ]
          );

          results.new++;
          results.analyzed++;

          // Broadcast to dashboard
          if (global.broadcast) {
            global.broadcast({
              type: 'NEW_JOB',
              job: { ...job, analysis, status: 'ANALYZED' },
            });
          }

        } catch (err) {
          results.errors.push(`Job ${project.id}: ${err.message}`);
        }
      }

      this.lastScanTime = new Date();
      this.scanCount++;

      console.log(`✅ Scan complete: ${results.new} new jobs, ${results.analyzed} analyzed`);

      if (global.broadcast) {
        global.broadcast({
          type: 'SCAN_COMPLETE',
          results,
          timestamp: this.lastScanTime,
        });
      }

    } catch (err) {
      results.errors.push(err.message);
      console.error('❌ Scan error:', err.message);
    }

    this.isScanning = false;
    return { success: true, ...results };
  }

  /**
   * Check for new messages in existing threads
   */
  async checkMessages() {
    try {
      const { success, threads } = await getThreads();
      if (!success) return { newMessages: 0 };

      let newMessages = 0;

      for (const thread of threads) {
        const { messages } = await getMessages(thread.id);

        for (const msg of messages) {
          // Check if message already stored
          const existing = await get(
            'SELECT id FROM messages WHERE thread_id = ? AND content = ?',
            [String(thread.id), msg.message || '']
          );

          if (!existing && msg.from_user) {
            // Find associated job
            const job = await get(
              'SELECT id, title, analysis FROM jobs WHERE client_id = ? OR external_id = ?',
              [String(msg.from_user), String(thread.context?.id || '')]
            );

            if (job) {
              const draftReply = generateAutoReply(msg.message, job);

              await run(
                `INSERT INTO messages (job_id, thread_id, sender, sender_type, content, draft_reply, reply_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  job.id, String(thread.id),
                  msg.from_user_name || 'Client',
                  'client',
                  msg.message || '',
                  draftReply,
                  'pending',
                ]
              );

              newMessages++;

              if (global.broadcast) {
                global.broadcast({
                  type: 'NEW_MESSAGE',
                  message: {
                    job_id: job.id,
                    job_title: job.title,
                    sender: msg.from_user_name || 'Client',
                    content: msg.message,
                    draft_reply: draftReply,
                  },
                });
              }
            }
          }
        }
      }

      return { newMessages };
    } catch (err) {
      console.error('❌ Error checking messages:', err.message);
      return { newMessages: 0, error: err.message };
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

module.exports = { JobScanner };
