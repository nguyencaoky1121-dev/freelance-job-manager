const { JobScanner } = require('./jobScanner');

class ScannerManager {
  constructor() {
    this.jobScanner = new JobScanner();
    this.scanIntervalId = null;
    this.defaultScanInterval = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Start the job scanning process with a specified interval
   */
  startScanning(interval = this.defaultScanInterval) {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
    }

    console.log(`
🔄 Starting job scanner...`);
    console.log(`   Scan interval: ${interval / 1000} seconds`);

    // Initial scan
    this.performScan();

    // Set interval for subsequent scans
    this.scanIntervalId = setInterval(() => {
      this.performScan();
    }, interval);
  }

  /**
   * Stop the job scanning process
   */
  stopScanning() {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
      console.log('🛑 Job scanner stopped.');
    }
  }

  /**
   * Perform a single job scan and log results
   */
  async performScan() {
    try {
      const result = await this.jobScanner.scanJobs();
      if (result.success) {
        console.log(`   Scan results: ${result.new} new jobs, ${result.analyzed} analyzed, ${result.skipped} skipped.`);
      } else {
        console.error(`   Scan failed: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Error during job scan:', error.message);
    }
  }

  /**
   * Get current status of the scanner
   */
  getStatus() {
    return {
      isScanning: !!this.scanIntervalId,
      lastScanTime: this.jobScanner.lastScanTime,
      scanCount: this.jobScanner.scanCount,
      userSkills: this.jobScanner.userSkills,
      currentScanInterval: this.scanIntervalId ? this.defaultScanInterval : 0,
    };
  }

  /**
   * Update scan interval (in milliseconds)
   */
  updateScanInterval(newInterval) {
    if (newInterval > 0) {
      this.defaultScanInterval = newInterval;
      this.startScanning(this.defaultScanInterval);
      console.log(`   Scan interval updated to ${newInterval / 1000} seconds.`);
      return { success: true, interval: newInterval };
    } else {
      return { success: false, error: 'Interval must be positive.' };
    }
  }
}

module.exports = { ScannerManager };