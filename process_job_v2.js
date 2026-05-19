const { SmartAutoWorkPipeline } = require('./backend/services/smartAutoWorkPipeline');
const { get } = require('./backend/db/database');
require('dotenv').config();

async function processJob(jobId, action) {
  const pipeline = new SmartAutoWorkPipeline();
  try {
    const job = await get("SELECT * FROM jobs WHERE id = ?", [jobId]);
    if (!job) {
      console.error("❌ Job not found:", jobId);
      return;
    }

    console.log(`\n🚀 Action: ${action.toUpperCase()} for job: ${job.title}`);

    let result;
    switch (action.toLowerCase()) {
      case 'analyze':
        result = await pipeline.analyzeOnly(job);
        break;
      case 'attempt':
        result = await pipeline.postAttemptOnly(jobId);
        break;
      case 'submit':
        result = await pipeline.submitSolutionOnly(jobId);
        break;
      default:
        console.error("❌ Invalid action. Use: analyze, attempt, or submit");
        return;
    }

    console.log("\n💎 Result:", JSON.stringify(result, null, 2));

    // Display logs if failed
    if (!result.success) {
      const updatedJob = await get("SELECT logs FROM jobs WHERE id = ?", [jobId]);
      console.log("\n📜 Logs from DB:", updatedJob.logs);
    }

  } catch (err) {
    console.error("❌ Error in processJobV2:", err);
  } finally {
    pipeline.shutdown();
  }
}

const jobId = process.argv[2];
const action = process.argv[3] || 'analyze';

if (!jobId) {
  console.log("Usage: node process_job_v2.js <job_id> <analyze|attempt|submit>");
  process.exit(1);
}

processJob(jobId, action);
