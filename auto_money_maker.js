const { GitHubScanner } = require('./backend/services/githubScanner');
const { JobScanner } = require('./backend/services/jobScanner');
const { SmartAutoWorkPipeline } = require('./backend/services/smartAutoWorkPipeline');
const { all, run } = require('./backend/db/database');
require('dotenv').config();

async function runAutoMoneyMaker() {
  console.log('💰 --- AUTO MONEY MAKER STARTING --- 💰');

  const githubScanner = new GitHubScanner();
  const jobScanner = new JobScanner();
  const pipeline = new SmartAutoWorkPipeline();

  // 1. Quét GitHub/Algora/Gitcoin Bounties
  console.log('\nStep 1: Scanning for GitHub Bounties...');
  const ghResults = await githubScanner.scanBounties();
  console.log(`   Result: ${ghResults.new} new bounties found.`);

  // 2. Quét Freelancer Jobs
  console.log('\nStep 2: Scanning for Freelancer Jobs...');
  const flResults = await jobScanner.scanJobs();
  console.log(`   Result: ${flResults.new} new jobs found.`);

  // 3. Lấy danh sách job cần xử lý và hiển thị cho người dùng
  console.log('\nStep 3: Fetching jobs to process...');
  const bounties = await all(
    `SELECT * FROM jobs
     WHERE status IN ('SCANNED', 'ANALYZED')
     AND budget >= 0
     AND (bid_placed IS NULL OR bid_placed = 0)
     ORDER BY budget DESC
     LIMIT 10`
  );

  console.log(`   Found ${bounties.length} potential jobs to process.`);

  // --- PAUSE FOR USER ACTION ---
  // In a full UI, this is where you'd display the list of bounties
  // and wait for the user to click 'Nộp Comment' or 'Gửi Bài'.
  // For CLI, we'll simulate this by just listing them and waiting for a command.
  console.log('\n--- Available Jobs ---');
  bounties.forEach(bounty => {
    console.log(`[${bounty.platform.toUpperCase()}] ${bounty.title} ($${bounty.budget}) - ID: ${bounty.id}`);
  });
  console.log('\n--- Awaiting User Action ---');
  console.log('Please run the appropriate command (e.g., `node process_job.js <job_id>`) to proceed.');

  // The actual processing loop is now triggered externally based on user input.
  // We no longer auto-execute the pipeline here.
}

// Chạy script
runAutoMoneyMaker().catch(console.error);
