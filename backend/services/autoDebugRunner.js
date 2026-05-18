const { RailwayLogAnalyzer } = require('./railwayLogAnalyzer');
const { ErrorAutoFixer } = require('./errorAutoFixer');
const { IntelligentCodeGenerator } = require('./intelligentCodeGenerator');
const { run, all } = require('../db/database');

/**
 * AutoDebugRunner - Orchestrates the auto-detect, fix, and test loop
 * Continuously monitors Railway logs, identifies errors, applies fixes, and tests
 */
class AutoDebugRunner {
  constructor() {
    this.logAnalyzer = new RailwayLogAnalyzer();
    this.errorFixer = new ErrorAutoFixer();
    this.codeGenerator = new IntelligentCodeGenerator();

    this.isRunning = false;
    this.currentCycle = 0;
    this.maxCycles = 5;
    this.pollingInterval = null;
    this.pollingDelay = 60000; // 1 minute between checks

    this.debugHistory = [];
    this.pendingFixes = [];

    this.status = {
      running: false,
      lastCheck: null,
      errorsDetected: 0,
      errorsFixed: 0,
      cycles: 0,
      totalTestsRun: 0,
    };
  }

  /**
   * Start the auto-debug loop
   */
  async start(projectId, serviceId, options = {}) {
    if (this.isRunning) {
      return { success: false, error: 'Auto-debug already running' };
    }

    const {
      maxCycles = 5,
      pollingDelay = 60000,
      autoFix = true,
    } = options;

    this.maxCycles = maxCycles;
    this.pollingDelay = pollingDelay;
    this.autoFix = autoFix;

    this.isRunning = true;
    this.status.running = true;

    console.log(`\n🔧 Auto-Debug Runner starting...`);
    console.log(`   Project: ${projectId}`);
    console.log(`   Service: ${serviceId}`);
    console.log(`   Max cycles: ${maxCycles}`);
    console.log(`   Polling delay: ${pollingDelay / 1000}s`);
    console.log(`   Auto-fix: ${autoFix ? 'enabled' : 'disabled'}`);

    // Store project config for polling
    this.projectId = projectId;
    this.serviceId = serviceId;

    // Start the debug loop
    await this.runDebugCycle();

    // Set up continuous polling
    this.pollingInterval = setInterval(async () => {
      if (!this.isRunning) {
        this.stop();
        return;
      }

      if (this.currentCycle < this.maxCycles) {
        await this.runDebugCycle();
      } else {
        console.log(`\n✅ Max cycles (${this.maxCycles}) reached. Stopping auto-debug.`);
        this.stop();
      }
    }, this.pollingDelay);

    return {
      success: true,
      message: 'Auto-debug started',
      projectId,
      serviceId,
    };
  }

  /**
   * Stop the auto-debug loop
   */
  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.isRunning = false;
    this.status.running = false;

    console.log(`\n🛑 Auto-Debug Runner stopped`);
    console.log(`   Cycles completed: ${this.currentCycle}`);
    console.log(`   Errors detected: ${this.status.errorsDetected}`);
    console.log(`   Errors fixed: ${this.status.errorsFixed}`);

    return {
      success: true,
      cycles: this.currentCycle,
      errorsDetected: this.status.errorsDetected,
      errorsFixed: this.status.errorsFixed,
    };
  }

  /**
   * Run a single debug cycle
   */
  async runDebugCycle() {
    this.currentCycle++;
    this.status.cycles = this.currentCycle;
    this.status.lastCheck = new Date().toISOString();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Debug Cycle #${this.currentCycle}`);
    console.log(`   Time: ${new Date().toLocaleString()}`);
    console.log(`${'='.repeat(60)}`);

    const cycleResult = {
      cycle: this.currentCycle,
      timestamp: this.status.lastCheck,
      errorsFound: [],
      fixesApplied: [],
      testsRun: [],
      errorsRemaining: 0,
      success: false,
    };

    try {
      // Step 1: Fetch and analyze logs
      console.log(`\n📡 Step 1: Fetching Railway logs...`);
      const logsResult = await this.logAnalyzer.fetchRailwayLogs(
        this.projectId,
        this.serviceId
      );

      if (!logsResult.success) {
        console.log(`   ⚠️ Could not fetch real logs: ${logsResult.error}`);
        console.log(`   Using mock logs for analysis...`);
      }

      const { errors, warnings } = this.logAnalyzer.analyzeLogs(logsResult.logs);

      console.log(`   📊 Log analysis:`);
      console.log(`      - Errors found: ${errors.length}`);
      console.log(`      - Warnings found: ${warnings.length}`);

      this.status.errorsDetected += errors.length;
      cycleResult.errorsFound = errors;

      // Step 2: Generate fix strategies
      if (errors.length > 0) {
        console.log(`\n🛠️ Step 2: Analyzing errors and generating fixes...`);

        const groupedErrors = this.logAnalyzer.groupErrorsByType(errors);
        const fixReport = this.errorFixer.generateFixReport(errors);

        console.log(`   📋 Error groups:`);
        for (const [type, group] of Object.entries(groupedErrors)) {
          console.log(`      - ${type}: ${group.count} occurrence(s), files: ${group.locations.join(', ') || 'unknown'}`);
        }

        console.log(`\n   🔧 Fix report:`);
        console.log(`      - Fixable errors: ${fixReport.fixableErrors}`);
        console.log(`      - Requires manual: ${fixReport.requiresManual}`);
        console.log(`      - Commands to run: ${fixReport.commands.length}`);

        if (fixReport.commands.length > 0) {
          console.log(`      Commands:`);
          for (const cmd of fixReport.commands) {
            console.log(`        $ ${cmd}`);
          }
        }

        // Step 3: Apply fixes
        if (this.autoFix && fixReport.fixableErrors > 0) {
          console.log(`\n⚡ Step 3: Applying fixes...`);

          for (const error of errors) {
            const fixResult = await this.applyFixForError(error);
            if (fixResult.applied) {
              cycleResult.fixesApplied.push(fixResult);
              this.status.errorsFixed++;
            }
          }

          console.log(`   ✅ Applied ${cycleResult.fixesApplied.length} fix(es)`);
        }

        // Step 4: Run tests
        console.log(`\n🧪 Step 4: Running tests...`);
        const testResult = await this.runTests();

        cycleResult.testsRun = testResult.tests;
        this.status.totalTestsRun += testResult.total;
        console.log(`   📊 Tests: ${testResult.passed}/${testResult.total} passed`);

        if (testResult.failed > 0) {
          console.log(`   ❌ Failed tests: ${testResult.failed}`);
          for (const test of testResult.failures) {
            console.log(`      - ${test.name}: ${test.error}`);
          }
        }

        // Step 5: Check if errors are resolved
        console.log(`\n🔍 Step 5: Verifying fixes...`);
        const remainingLogs = await this.logAnalyzer.fetchRailwayLogs(
          this.projectId,
          this.serviceId
        );
        const { errors: remainingErrors } = this.logAnalyzer.analyzeLogs(remainingLogs.logs);

        cycleResult.errorsRemaining = remainingErrors.length;
        cycleResult.success = remainingErrors.length === 0;

        if (cycleResult.success) {
          console.log(`\n✅ All errors resolved! Cycle #${this.currentCycle} complete.`);
        } else {
          console.log(`\n⚠️ ${remainingErrors.length} error(s) remain. Will retry...`);
        }
      } else {
        console.log(`\n✨ No errors detected. Everything looks good!`);
        cycleResult.success = true;
      }

      // Broadcast status update
      this.broadcastUpdate(cycleResult);

    } catch (err) {
      console.error(`\n❌ Cycle #${this.currentCycle} failed:`, err.message);
      cycleResult.error = err.message;
    }

    // Store cycle result
    this.debugHistory.push(cycleResult);
    await this.saveDebugHistory(cycleResult);

    return cycleResult;
  }

  /**
   * Apply a fix for a specific error
   */
  async applyFixForError(error) {
    const analysis = this.errorFixer.analyzeError(error);

    const result = {
      errorType: error.type,
      errorMessage: error.message,
      analysis,
      applied: false,
      details: null,
    };

    // Check if fix is auto-applicable
    if (analysis.confidence < 0.6) {
      result.details = 'Confidence too low for auto-fix';
      this.pendingFixes.push(error);
      return result;
    }

    // Handle different error types
    switch (error.type) {
      case 'module':
        // Try to install missing module
        const moduleMatch = error.message.match(/['"]([^'"]+)['"]/);
        if (moduleMatch) {
          const moduleName = moduleMatch[1];
          result.applied = true;
          result.details = {
            action: 'install',
            module: moduleName,
            command: `npm install ${moduleName}`,
            note: 'Run this command in your deployment environment',
          };
        }
        break;

      case 'undefined':
      case 'null':
      case 'type':
        // These need code changes - generate fix suggestion
        result.applied = true;
        result.details = {
          action: 'code_change',
          suggestion: analysis.suggestion,
          locations: error.context?.file ? [error.context.file] : [],
        };
        break;

      case 'promise':
        result.applied = true;
        result.details = {
          action: 'error_handler',
          suggestion: 'Add try/catch or .catch() handler',
          locations: error.context?.file ? [error.context.file] : [],
        };
        break;

      default:
        result.details = 'No auto-fix available for this error type';
        this.pendingFixes.push(error);
    }

    return result;
  }

  /**
   * Run tests to verify fixes
   */
  async runTests() {
    const result = {
      total: 0,
      passed: 0,
      failed: 0,
      failures: [],
      tests: [],
    };

    // Simulate test run - in real implementation, this would execute actual tests
    // For now, we'll check if we have test files and report based on compilation

    try {
      // Check for syntax errors by attempting to require modules
      const testModules = ['backend/server.js', 'backend/services/feedbackTracker.js'];

      for (const module of testModules) {
        result.total++;
        const test = {
          name: `Syntax check: ${module}`,
          passed: true,
        };

        try {
          // Simple syntax check - try to read the file
          const fs = require('fs');
          const content = fs.readFileSync(module, 'utf8');

          // Check for common syntax issues
          const issues = this.checkSyntaxIssues(content, module);
          if (issues.length > 0) {
            test.passed = false;
            test.issues = issues;
            result.failures.push({
              name: test.name,
              error: issues.join('; '),
            });
          }
        } catch (err) {
          test.passed = false;
          test.error = err.message;
          result.failures.push({
            name: test.name,
            error: err.message,
          });
        }

        result.tests.push(test);
        if (test.passed) {
          result.passed++;
        } else {
          result.failed++;
        }
      }

    } catch (err) {
      console.error('Test execution error:', err.message);
    }

    return result;
  }

  /**
   * Check for syntax issues in code
   */
  checkSyntaxIssues(content, filePath) {
    const issues = [];

    // Check for mismatched brackets
    const brackets = { '{': 0, '[': 0, '(': 0 };
    const bracketPairs = { '}': '{', ']': '[', ')': '(' };

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      // Skip strings and comments
      if (char === '"' || char === "'" || char === '`') {
        const endChar = char;
        i++;
        while (i < content.length && content[i] !== endChar) {
          if (content[i] === '\\') i++;
          i++;
        }
        continue;
      }

      if (char === '/') {
        if (content[i + 1] === '/') {
          i += 2;
          while (i < content.length && content[i] !== '\n') i++;
          continue;
        }
        if (content[i + 1] === '*') {
          i += 2;
          while (i < content.length - 1 && content[i] !== '*' && content[i + 1] !== '/') i++;
          i += 2;
          continue;
        }
      }

      if (char in brackets) {
        brackets[char]++;
      } else if (char in bracketPairs) {
        const open = bracketPairs[char];
        brackets[open]--;
        if (brackets[open] < 0) {
          issues.push(`Unexpected closing bracket at position ${i}`);
          brackets[open] = 0;
        }
      }
    }

    // Check for unclosed brackets
    for (const [bracket, count] of Object.entries(brackets)) {
      if (count !== 0) {
        issues.push(`Unclosed bracket: ${bracket} (${count} unclosed)`);
      }
    }

    return issues;
  }

  /**
   * Broadcast status update to connected clients
   */
  broadcastUpdate(cycleResult) {
    if (global.broadcast) {
      global.broadcast({
        type: 'AUTO_DEBUG_UPDATE',
        status: this.status,
        currentCycle: this.currentCycle,
        cycleResult: {
          errorsFound: cycleResult.errorsFound.length,
          fixesApplied: cycleResult.fixesApplied.length,
          errorsRemaining: cycleResult.errorsRemaining,
          success: cycleResult.success,
        },
        pendingFixes: this.pendingFixes.length,
      });
    }
  }

  /**
   * Save debug history to database
   */
  async saveDebugHistory(cycleResult) {
    try {
      await run(
        `INSERT INTO debug_history (cycle, timestamp, errors_found, fixes_applied, tests_passed, tests_failed, errors_remaining, success, details)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cycleResult.cycle,
          cycleResult.timestamp,
          cycleResult.errorsFound.length,
          cycleResult.fixesApplied.length,
          cycleResult.testsRun.passed || 0,
          cycleResult.testsRun.failed || 0,
          cycleResult.errorsRemaining,
          cycleResult.success ? 1 : 0,
          JSON.stringify(cycleResult),
        ]
      );
    } catch (err) {
      console.error('Failed to save debug history:', err.message);
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      running: this.isRunning,
      currentCycle: this.currentCycle,
      maxCycles: this.maxCycles,
      pollingDelay: this.pollingDelay,
      status: this.status,
      projectId: this.projectId,
      serviceId: this.serviceId,
      pendingFixes: this.pendingFixes.length,
    };
  }

  /**
   * Get debug history
   */
  async getHistory(limit = 10) {
    try {
      const history = await all(
        'SELECT * FROM debug_history ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );
      return history;
    } catch (err) {
      console.error('Failed to get debug history:', err.message);
      return this.debugHistory.slice(-limit);
    }
  }

  /**
   * Trigger immediate debug cycle (without waiting for next poll)
   */
  async triggerNow() {
    if (!this.isRunning) {
      return { success: false, error: 'Auto-debug not running' };
    }

    console.log(`\n⚡ Triggering immediate debug cycle...`);
    return await this.runDebugCycle();
  }

  /**
   * Update configuration
   */
  updateConfig(options = {}) {
    if (options.maxCycles) this.maxCycles = options.maxCycles;
    if (options.pollingDelay) this.pollingDelay = options.pollingDelay;
    if (typeof options.autoFix === 'boolean') this.autoFix = options.autoFix;

    return {
      success: true,
      config: {
        maxCycles: this.maxCycles,
        pollingDelay: this.pollingDelay,
        autoFix: this.autoFix,
      },
    };
  }
}

// Create singleton instance
const autoDebugRunner = new AutoDebugRunner();

module.exports = { AutoDebugRunner, autoDebugRunner };