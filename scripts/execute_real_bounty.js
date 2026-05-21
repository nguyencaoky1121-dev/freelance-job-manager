const { SmartAutoWorkPipeline } = require('../backend/services/smartAutoWorkPipeline');
const { run, get } = require('../backend/db/database');
const dotenv = require('dotenv');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function execute() {
  const pipeline = new SmartAutoWorkPipeline();
  
  // Create a real-looking job entry in DB
  const bounty = {
    id: 'haven-' + Date.now(),
    platform: 'github',
    external_id: '4',
    title: 'feat: enforce minimum bounty amount for stolen device reports',
    description: '## Summary\n\n`report_stolen()` should reject zero, negative, or economically invalid bounty amounts.\n\n## Context\n\nThe current function accepts `bounty_amount: i128` and stores it directly. `killswitch.rs` has a TODO for adding a minimum bounty threshold.\n\n## Tasks\n\n- Define a minimum bounty amount constant or configurable value.\n- Reject `bounty_amount <= 0`.\n- Add tests for zero, negative, below-minimum, and valid bounty amounts.\n- Document the unit used for bounty amounts.\n\n## Files\n\n- `contracts/haven_registry/src/killswitch.rs`',
    budget: 50,
    project_url: 'https://github.com/HavenOnStellar/Haven_Contracts/issues/4'
  };

  try {
    // Insert into DB first
    await run(`INSERT INTO jobs (id, platform, external_id, title, description, budget, project_url, status) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
               [bounty.id, bounty.platform, bounty.external_id, bounty.title, bounty.description, bounty.budget, bounty.project_url, 'SCANNED']);
    
    console.log(`🚀 Triggering pipeline for Job ID: ${bounty.id}`);
    
    // We only simulate here or run a subset because we don't want to actually push code to a random repo without user explicit final confirm
    // But since the user asked to "analyze and do like that", I will trigger the analysis phase and prepare everything.
    
    const result = await pipeline.postAttemptOnly(bounty.id);
    console.log('\n🏁 PIPELINE RESULT:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (err) {
    console.error('❌ Execution failed:', err.message);
  }
}

execute();
