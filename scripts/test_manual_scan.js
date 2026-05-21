const { ScannerManager } = require('../backend/services/scannerManager');
const { JobScanner } = require('../backend/services/jobScanner');
const { InternalAutoWorkPipeline } = require('../backend/services/internalAutoWorkPipeline');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
  global.autoworkPipeline = new InternalAutoWorkPipeline();
  const scanner = new ScannerManager();
  
  console.log("🛠️ Starting manual scan test...");
  await scanner.performScan();
  console.log("🏁 Manual scan test finished.");
}

test();
