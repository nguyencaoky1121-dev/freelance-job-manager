const { all } = require('./backend/db/database');

async function checkJobs() {
  try {
    const jobs = await all("SELECT id, title, status, analysis FROM jobs ORDER BY created_at DESC LIMIT 5;");
    console.log(JSON.stringify(jobs, null, 2));
  } catch (err) {
    console.error(err);
  }
}

checkJobs();
