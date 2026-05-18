const axios = require('axios');

/**
 * Railway Log Analyzer - Fetches and parses Railway deployment logs
 * Detects errors, warnings, and patterns in deployment/runtime logs
 */
class RailwayLogAnalyzer {
  constructor() {
    this.errorPatterns = [
      // JavaScript/Node.js errors
      { pattern: /SyntaxError:/i, type: 'syntax', severity: 'critical' },
      { pattern: /ReferenceError:/i, type: 'reference', severity: 'critical' },
      { pattern: /TypeError:/i, type: 'type', severity: 'critical' },
      { pattern: /Error:/i, type: 'general', severity: 'error' },
      { pattern: /Cannot (read|find|resolve)/i, type: 'undefined', severity: 'error' },
      { pattern: /undefined is not (a function|an object)/i, type: 'undefined', severity: 'critical' },
      { pattern: /null is not (a function|an object)/i, type: 'null', severity: 'critical' },

      // Module/Import errors
      { pattern: /Cannot find module/i, type: 'module', severity: 'error' },
      { pattern: /Module not found/i, type: 'module', severity: 'error' },
      { pattern: /Failed to require/i, type: 'require', severity: 'error' },
      { pattern: /ERR_REQUIRE_ESM/i, type: 'esm', severity: 'error' },
      { pattern: /Unexpected token/i, type: 'token', severity: 'critical' },

      // Database errors
      { pattern: /ECONNREFUSED/i, type: 'connection', severity: 'critical' },
      { pattern: /ETIMEDOUT/i, type: 'timeout', severity: 'error' },
      { pattern: /ENOTFOUND/i, type: 'dns', severity: 'error' },
      { pattern: /Connection refused/i, type: 'connection', severity: 'critical' },
      { pattern: /database/i, type: 'database', severity: 'error' },

      // API/HTTP errors
      { pattern: /404|Not Found/i, type: 'not_found', severity: 'error' },
      { pattern: /500|Internal Server Error/i, type: 'server_error', severity: 'critical' },
      { pattern: /403|Forbidden/i, type: 'forbidden', severity: 'error' },
      { pattern: /401|Unauthorized/i, type: 'auth', severity: 'error' },

      // Build errors
      { pattern: /Build failed/i, type: 'build', severity: 'critical' },
      { pattern: /Compilation failed/i, type: 'compilation', severity: 'critical' },
      { pattern: /tsc.*error/i, type: 'typescript', severity: 'critical' },
      { pattern: /webpack.*error/i, type: 'webpack', severity: 'critical' },
      { pattern: /npm.*error/i, type: 'npm', severity: 'error' },
      { pattern: /npm ERR!/i, type: 'npm', severity: 'critical' },

      // Runtime errors
      { pattern: /unhandledPromiseRejection/i, type: 'promise', severity: 'critical' },
      { pattern: /unhandledRejection/i, type: 'promise', severity: 'critical' },
      { pattern: /FATAL/i, type: 'fatal', severity: 'critical' },
      { pattern: /PANIC/i, type: 'panic', severity: 'critical' },

      // Warning patterns (less severe)
      { pattern: /Warning:/i, type: 'warning', severity: 'warning' },
      { pattern: /deprecated/i, type: 'deprecation', severity: 'warning' },
      { pattern: /DeprecationWarning/i, type: 'deprecation', severity: 'warning' },
    ];

    this.contextPatterns = [
      // Stack trace captures
      { pattern: /at\s+.+\s+\((.+):(\d+):(\d+)\)/gi, extract: ['file', 'line', 'col'] },
      { pattern: /at\s+(.+):(\d+):(\d+)/gi, extract: ['file', 'line', 'col'] },

      // Code context
      { pattern: /in\s+(.+?)\s+(?:line|on line)/i, extract: ['file'] },
      { pattern: /file:\s*(.+?)(?:\s|$)/i, extract: ['file'] },

      // Module context
      { pattern: /from\s+['"](.+)['"]/i, extract: ['module'] },
      { pattern: /require\(['"](.+)['"]\)/i, extract: ['module'] },
    ];
  }

  /**
   * Fetch logs from Railway API
   */
  async fetchRailwayLogs(projectId, serviceId, options = {}) {
    const {
      limit = 100,
      stream = 'RAW',
      startTime,
      endTime,
    } = options;

    const apiToken = process.env.RAILWAY_API_TOKEN;
    if (!apiToken) {
      return {
        success: false,
        error: 'RAILWAY_API_TOKEN not configured',
        logs: this.getMockLogs()
      };
    }

    try {
      const params = new URLSearchParams({ limit, stream });
      if (startTime) params.append('startTime', startTime);
      if (endTime) params.append('endTime', endTime);

      const response = await axios.get(
        `https://backboard.railway.app/api/v2/project/${projectId}/service/${serviceId}/logs`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          params,
        }
      );

      return {
        success: true,
        logs: response.data.logs || [],
      };
    } catch (err) {
      console.error('Failed to fetch Railway logs:', err.message);

      // Return mock logs for development/demo
      return {
        success: false,
        error: err.message,
        logs: this.getMockLogs(),
      };
    }
  }

  /**
   * Get mock logs for development/demo when Railway API is not available
   */
  getMockLogs() {
    return [
      { timestamp: new Date().toISOString(), level: 'error', message: 'SyntaxError: Unexpected token' },
      { timestamp: new Date().toISOString(), level: 'error', message: '    at Object.<anonymous> (/app/server.js:42:10)' },
      { timestamp: new Date().toISOString(), level: 'error', message: 'TypeError: Cannot read property "foo" of undefined' },
      { timestamp: new Date().toISOString(), level: 'error', message: '    at Function.module.exports (/app/routes/api.js:15:5)' },
      { timestamp: new Date().toISOString(), level: 'error', message: 'Error: Cannot find module "./utils/helpers"' },
      { timestamp: new Date().toISOString(), level: 'warning', message: 'DeprecationWarning: Using deprecated API' },
      { timestamp: new Date().toISOString(), level: 'info', message: 'Server started on port 3000' },
    ];
  }

  /**
   * Analyze log entries and extract errors
   */
  analyzeLogs(logs) {
    const errors = [];
    const warnings = [];

    for (const log of logs) {
      const message = log.message || '';
      const level = log.level?.toLowerCase() || 'info';

      // Check against error patterns
      for (const errorPattern of this.errorPatterns) {
        if (errorPattern.pattern.test(message)) {
          const extracted = this.extractContext(message);

          const errorEntry = {
            type: errorPattern.type,
            severity: errorPattern.severity,
            message: message.trim(),
            timestamp: log.timestamp,
            context: extracted,
            stackTrace: this.extractStackTrace(log, errors.length),
          };

          if (errorPattern.severity === 'warning' || level === 'warning') {
            warnings.push(errorEntry);
          } else {
            errors.push(errorEntry);
          }
          break;
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Extract context information from error message
   */
  extractContext(message) {
    const context = {};

    for (const pattern of this.contextPatterns) {
      const match = message.match(pattern.pattern);
      if (match && pattern.extract) {
        pattern.extract.forEach((field, index) => {
          context[field] = match[index + 1] || match[index];
        });
      }
    }

    return context;
  }

  /**
   * Extract stack trace from log entry
   */
  extractStackTrace(log, index) {
    const lines = (log.message || '').split('\n');
    const stackLines = [];

    let capture = false;
    for (const line of lines) {
      if (line.includes('at ') || line.includes('    ')) {
        capture = true;
        stackLines.push(line.trim());
      } else if (capture && stackLines.length > 0) {
        break;
      }
    }

    return stackLines;
  }

  /**
   * Parse stack trace to extract file paths and line numbers
   */
  parseStackTrace(stackLines) {
    const locations = [];

    for (const line of stackLines) {
      const match = line.match(/at\s+.+\s+\((.+):(\d+):(\d+)\)/);
      if (match) {
        locations.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
        });
      } else {
        const simpleMatch = line.match(/at\s+(.+):(\d+):(\d+)/);
        if (simpleMatch) {
          locations.push({
            file: simpleMatch[1],
            line: parseInt(simpleMatch[2]),
            column: parseInt(simpleMatch[3]),
          });
        }
      }
    }

    return locations;
  }

  /**
   * Group errors by type for consolidated fixing
   */
  groupErrorsByType(errors) {
    const groups = {};

    for (const error of errors) {
      const key = error.type;
      if (!groups[key]) {
        groups[key] = {
          type: error.type,
          severity: error.severity,
          occurrences: [],
          count: 0,
          locations: new Set(),
        };
      }
      groups[key].occurrences.push(error);
      groups[key].count++;

      if (error.context?.file) {
        groups[key].locations.add(error.context.file);
      }
    }

    // Convert Set to Array for JSON serialization
    for (const group of Object.values(groups)) {
      group.locations = Array.from(group.locations);
    }

    return groups;
  }

  /**
   * Get error summary for dashboard display
   */
  getErrorSummary(errors, warnings) {
    const summary = {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      criticalErrors: errors.filter(e => e.severity === 'critical').length,
      errorTypes: new Set(errors.map(e => e.type)),
      affectedFiles: new Set(),
    };

    for (const error of errors) {
      if (error.context?.file) {
        summary.affectedFiles.add(error.context.file);
      }
    }

    summary.errorTypes = Array.from(summary.errorTypes);
    summary.affectedFiles = Array.from(summary.affectedFiles);
    summary.canAutoFix = this.estimateAutoFixability(errors);

    return summary;
  }

  /**
   * Estimate which errors can be auto-fixed
   */
  estimateAutoFixability(errors) {
    const fixableTypes = ['syntax', 'type', 'undefined', 'module', 'require', 'token', 'promise'];
    const fixable = errors.filter(e => fixableTypes.includes(e.type));

    return {
      total: errors.length,
      fixable: fixable.length,
      percentage: errors.length > 0 ? Math.round((fixable.length / errors.length) * 100) : 100,
      requiresManual: errors.length - fixable.length,
    };
  }
}

module.exports = { RailwayLogAnalyzer };