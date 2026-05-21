const { all } = require('../backend/db/database');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function list() {
  const jobs = await all("SELECT id, platform, title, status, project_url, submitted_at FROM jobs WHERE status IN ('SUBMITTED', 'SIMULATED_SUBMITTED') ORDER BY submitted_at DESC LIMIT 10;");
  console.log(JSON.stringify(jobs, null, 2));
}

list();
