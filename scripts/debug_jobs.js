const { getDB, all } = require('../backend/db/database');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function debug() {
  try {
    const jobs = await all("SELECT id, platform, title, status, budget, created_at, updated_at FROM jobs ORDER BY created_at DESC LIMIT 15;");
    console.log("=== RECENT JOBS ===");
    console.log(JSON.stringify(jobs, null, 2));

    const stats = await all("SELECT status, count(*) as count FROM jobs GROUP BY status;");
    console.log("\n=== JOB STATS BY STATUS ===");
    console.log(JSON.stringify(stats, null, 2));

    const activePipelines = await all("SELECT id, title, status, auto_execute FROM jobs WHERE status IN ('IN_PROGRESS', 'SUBMITTED', 'SIMULATED_SUBMITTED');");
    console.log("\n=== ACTIVE/SUBMITTED JOBS ===");
    console.log(JSON.stringify(activePipelines, null, 2));

  } catch (err) {
    console.error("❌ Error running debug script:", err.message);
  }
}

debug();
