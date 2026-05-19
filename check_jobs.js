const { all } = require('./backend/db/database');

async function checkJobs() {
  try {
    const jobs = await all("SELECT id, title, status, platform, project_url FROM jobs WHERE platform = 'github' AND status != 'SKIPPED' ORDER BY created_at DESC LIMIT 5;");
    console.log(JSON.stringify(jobs, null, 2));
  } catch (err) {
    console.error(err);
  }
}

checkJobs();
