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

  // 3. Lấy danh sách job cần xử lý
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

  // 4. Xử lý từng job thông qua Pipeline
  for (const bounty of bounties) {
    console.log(`\n--- Processing [${bounty.platform.toUpperCase()}] ${bounty.title} ($${bounty.budget}) ---`);
    try {
      // Validate và skip nếu không phù hợp (nhưng chấp nhận budget thấp)
      const validation = await pipeline.validateBounty(bounty);

      // Override validation cho budget thấp nếu là job tự động
      if (!validation.valid && validation.reason === 'No budget defined' && bounty.budget >= 0) {
        console.log('   Note: Low budget job, processing anyway for profile building...');
      } else if (!validation.valid) {
        console.log(`   Skipping: ${validation.reason}`);
        await run('UPDATE jobs SET status = ? WHERE id = ?', ['SKIPPED', bounty.id]);
        continue;
      }

      // Agent 2 & 3 & 4: Analyze -> Generate -> Execute
      console.log('   Executing Multi-Agent Pipeline...');
      const result = await pipeline.processSingleBounty(bounty);

      if (result.status === 'pr_created' || result.status === 'submitted') {
        console.log(`   ✅ SUCCESS: ${result.status.toUpperCase()} - PR: ${result.prUrl || 'N/A'}`);
      } else {
        console.log(`   ⚠️ RESULT: ${JSON.stringify(result)}`);
      }
    } catch (err) {
      console.error(`   ❌ ERROR processing job ${bounty.id}:`, err.message);
    }
  }

  console.log('\n💰 --- AUTO MONEY MAKER CYCLE COMPLETE --- 💰');
}

// Chạy script
runAutoMoneyMaker().catch(console.error);
