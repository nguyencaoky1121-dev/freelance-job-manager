const { SmartAutoWorkPipeline } = require('./backend/services/smartAutoWorkPipeline');
const { get } = require('./backend/db/database');
require('dotenv').config();

async function processJob(jobId) {
  const pipeline = new SmartAutoWorkPipeline();
  try {
    const job = await get("SELECT * FROM jobs WHERE id = ?", [jobId]);
    if (!job) {
      console.error("Job not found:", jobId);
      return;
    }

    console.log("Starting pipeline for job:", job.title);
    const result = await pipeline.processSingleBounty(job);
    console.log("Pipeline result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error in processJob:", err);
  }
}

const jobId = process.argv[2] || 'github_4464880736_1779180449464';
processJob(jobId);
