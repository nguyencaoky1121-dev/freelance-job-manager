const { JobMonitor } = require('../backend/services/jobMonitor');
const { InternalAutoWorkPipeline } = require('../backend/services/internalAutoWorkPipeline');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
  global.autoworkPipeline = new InternalAutoWorkPipeline();
  const monitor = new JobMonitor();
  
  console.log("🛠️ Starting GitHub scan test...");
  const result = await monitor.autoScanGitHub();
  console.log("🏁 GitHub scan test result:", JSON.stringify(result, null, 2));
}

test();
