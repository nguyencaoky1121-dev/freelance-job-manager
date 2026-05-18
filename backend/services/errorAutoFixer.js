const fs = require('fs');
const path = require('path');

/**
 * Error Auto-Fixer - Analyzes errors and generates code fixes
 * Uses pattern matching and known solutions for common errors
 */
class ErrorAutoFixer {
  constructor() {
    // Fix strategies for different error types
    this.fixStrategies = {
      syntax: {
        detect: (msg) => /SyntaxError|Unexpected token/.test(msg),
        fix: (error, file) => this.fixSyntaxError(error, file),
      },
      type: {
        detect: (msg) => /TypeError|Cannot read property/.test(msg),
        fix: (error, file) => this.fixTypeError(error, file),
      },
      reference: {
        detect: (msg) => /ReferenceError|Cannot (read|find)/.test(msg),
        fix: (error, file) => this.fixReferenceError(error, file),
      },
      module: {
        detect: (msg) => /Cannot find module|Module not found/.test(msg),
        fix: (error, file) => this.fixModuleError(error, file),
      },
      undefined: {
        detect: (msg) => /undefined is not (a function|an object)/.test(msg),
        fix: (error, file) => this.fixUndefinedError(error, file),
      },
      null: {
        detect: (msg) => /null is not (a function|an object)/.test(msg),
        fix: (error, file) => this.fixNullError(error, file),
      },
      require: {
        detect: (msg) => /Failed to require|Cannot find module/.test(msg),
        fix: (error, file) => this.fixRequireError(error, file),
      },
      promise: {
        detect: (msg) => /unhandledPromiseRejection|unhandledRejection/.test(msg),
        fix: (error, file) => this.fixPromiseError(error, file),
      },
    };

    // Common fix templates
    this.templates = {
      nullCheck: (varName, context = '') => {
        if (context === 'function') {
          return `if (!${varName}) {\n  throw new Error('${varName} is required');\n}`;
        }
        return `if (${varName}) {\n  // ${varName} exists, proceed\n}`;
      },
      optionalChaining: (expr) => `${expr}?.`,
      nullishCoalescing: (expr, defaultVal) => `${expr} ?? ${defaultVal}`,
      guardClause: (condition, body) => `if (${condition}) {\n  return;\n}\n${body}`,
    };
  }

  /**
   * Analyze an error and generate fix strategy
   */
  analyzeError(error) {
    const message = error.message || '';

    for (const [type, strategy] of Object.entries(this.fixStrategies)) {
      if (strategy.detect(message)) {
        return {
          type,
          confidence: this.calculateConfidence(type, error),
          suggestion: this.getFixSuggestion(type, error),
          priority: this.getFixPriority(type),
        };
      }
    }

    return {
      type: 'unknown',
      confidence: 0,
      suggestion: 'Manual investigation required',
      priority: 'low',
    };
  }

  /**
   * Calculate confidence score for auto-fix
   */
  calculateConfidence(type, error) {
    let confidence = 0.5;

    // Higher confidence with specific error types
    const highConfidenceTypes = ['syntax', 'module', 'require'];
    if (highConfidenceTypes.includes(type)) {
      confidence += 0.3;
    }

    // Higher confidence with stack trace
    if (error.stackTrace && error.stackTrace.length > 0) {
      confidence += 0.1;
    }

    // Higher confidence with file location
    if (error.context?.file) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Get fix priority based on error type
   */
  getFixPriority(type) {
    const priorities = {
      syntax: 'critical',
      promise: 'critical',
      type: 'high',
      null: 'high',
      undefined: 'high',
      reference: 'medium',
      module: 'high',
      require: 'high',
    };
    return priorities[type] || 'low';
  }

  /**
   * Get human-readable fix suggestion
   */
  getFixSuggestion(type, error) {
    const suggestions = {
      syntax: 'Check for missing brackets, semicolons, or incorrect syntax',
      type: 'Add null/undefined checks before accessing properties',
      reference: 'Ensure the variable is defined before use',
      module: 'Install the missing module or check the import path',
      undefined: 'Add optional chaining (?.) or null checks',
      null: 'Add null coalescing (??) or guard clauses',
      require: 'Check the module path and ensure it exists',
      promise: 'Add .catch() handler or use try/catch with async/await',
    };
    return suggestions[type] || 'Review the error and fix manually';
  }

  /**
   * Generate fix for syntax errors
   */
  fixSyntaxError(error, file) {
    const suggestions = [];

    // Check for common syntax issues
    const msg = error.message;

    if (msg.includes('Unexpected token')) {
      suggestions.push({
        fix: 'Check for missing commas, brackets, or parentheses',
        example: '// Make sure all opening brackets have closing brackets\nconst arr = [1, 2, 3];\nconst obj = { a: 1, b: 2 };',
      });
    }

    if (msg.includes('Unexpected end')) {
      suggestions.push({
        fix: 'Missing closing bracket or parenthesis',
        example: 'function example() {\n  return { a: 1, b: 2 };\n}',
      });
    }

    if (msg.includes('await')) {
      suggestions.push({
        fix: 'await must be used inside an async function',
        example: 'async function fetchData() {\n  const data = await fetch(url);\n}',
      });
    }

    return {
      type: 'syntax',
      fixable: true,
      suggestions,
      autoFixAvailable: false,
      reason: 'Syntax errors require manual review of the code',
    };
  }

  /**
   * Generate fix for type errors
   */
  fixTypeError(error, file) {
    const msg = error.message;
    let varName = 'variable';

    // Extract variable name from error message
    const match = msg.match(/Cannot read property ['"]?(\w+)['"]?/);
    if (match) {
      varName = match[1];
    }

    return {
      type: 'type',
      fixable: true,
      suggestions: [
        {
          fix: `Add null check for '${varName}'`,
          example: `// Before\nconst value = obj.${varName};\n\n// After\nconst value = obj?.${varName};`,
        },
        {
          fix: 'Use optional chaining to safely access nested properties',
          example: `// Safe access with optional chaining\nconst value = obj?.${varName} ?? defaultValue;`,
        },
        {
          fix: 'Add guard clause before accessing properties',
          example: `if (!obj || !obj.${varName}) {\n  return defaultValue;\n}`,
        },
      ],
      autoFixAvailable: false,
      reason: 'Type errors can be fixed by adding optional chaining or null checks',
    };
  }

  /**
   * Generate fix for reference errors
   */
  fixReferenceError(error, file) {
    const msg = error.message;
    let varName = 'variable';

    // Extract variable name
    const match = msg.match(/(?:is not defined|Cannot find name) ['"]?(\w+)['"]?/);
    if (match) {
      varName = match[1];
    }

    return {
      type: 'reference',
      fixable: true,
      suggestions: [
        {
          fix: `Define '${varName}' before use`,
          example: `const ${varName} = initialValue;`,
        },
        {
          fix: 'Check for typos in variable name',
          example: `// Verify spelling matches declaration`,
        },
        {
          fix: 'Import the variable if from another module',
          example: `import { ${varName} } from './module';`,
        },
      ],
      autoFixAvailable: false,
      reason: 'Reference errors require defining or importing the variable',
    };
  }

  /**
   * Generate fix for module not found errors
   */
  fixModuleError(error, file) {
    const msg = error.message;
    let moduleName = 'module';

    // Extract module name
    const match = msg.match(/['"]([^'"]+)['"]/);
    if (match) {
      moduleName = match[1];
    }

    return {
      type: 'module',
      fixable: true,
      suggestions: [
        {
          fix: `Install missing module: npm install ${moduleName}`,
          command: `npm install ${moduleName}`,
        },
        {
          fix: 'Check if the module path is correct',
          example: `// Relative path\nimport something from './module';\n// Absolute path\nimport something from '@/module';`,
        },
        {
          fix: 'Check if the module is in package.json',
          example: `// Add to dependencies if missing\nnpm install ${moduleName} --save`,
        },
      ],
      autoFixAvailable: true,
      autoFixCommand: `npm install ${moduleName}`,
      reason: 'Module not found can be fixed by installing the package',
    };
  }

  /**
   * Generate fix for undefined errors
   */
  fixUndefinedError(error, file) {
    const msg = error.message;

    return {
      type: 'undefined',
      fixable: true,
      suggestions: [
        {
          fix: 'Use optional chaining to safely access properties',
          example: `// Before\nconst value = obj.property.nested;\n\n// After\nconst value = obj?.property?.nested;`,
        },
        {
          fix: 'Add nullish coalescing for default values',
          example: `const value = obj?.property ?? defaultValue;`,
        },
        {
          fix: 'Initialize the variable with a default value',
          example: `const property = initialValue || defaultValue;`,
        },
      ],
      autoFixAvailable: false,
      reason: 'Undefined errors are fixed with optional chaining or defaults',
    };
  }

  /**
   * Generate fix for null errors
   */
  fixNullError(error, file) {
    const msg = error.message;

    return {
      type: 'null',
      fixable: true,
      suggestions: [
        {
          fix: 'Add null check before calling methods',
          example: `if (obj && typeof obj.method === 'function') {\n  obj.method();\n}`,
        },
        {
          fix: 'Use optional chaining for method calls',
          example: `obj?.method?.();`,
        },
        {
          fix: 'Guard against null at function entry',
          example: `function process(obj) {\n  if (!obj) return;\n  // ...\n}`,
        },
      ],
      autoFixAvailable: false,
      reason: 'Null errors are fixed with proper null checks',
    };
  }

  /**
   * Generate fix for require errors
   */
  fixRequireError(error, file) {
    const msg = error.message;
    let modulePath = './module';

    const match = msg.match(/require\(['"]([^'"]+)['"]\)/);
    if (match) {
      modulePath = match[1];
    }

    return {
      type: 'require',
      fixable: true,
      suggestions: [
        {
          fix: 'Verify the module path is correct',
          example: `// Check that the file exists at the specified path`,
        },
        {
          fix: 'Use relative paths correctly',
          example: `// Same directory\nconst m = require('./module');\n// Parent directory\nconst m = require('../module');`,
        },
        {
          fix: 'Check for case sensitivity in file names',
          example: `// Linux is case-sensitive\nconst m = require('./MyModule'); // Not ./mymodule`,
        },
      ],
      autoFixAvailable: false,
      reason: 'Require errors need path verification',
    };
  }

  /**
   * Generate fix for promise rejection errors
   */
  fixPromiseError(error, file) {
    const msg = error.message;

    return {
      type: 'promise',
      fixable: true,
      suggestions: [
        {
          fix: 'Add .catch() handler to promise chain',
          example: `promise\n  .then(result => result)\n  .catch(err => {\n    console.error('Error:', err);\n    throw err;\n  });`,
        },
        {
          fix: 'Wrap async operations in try/catch',
          example: `async function example() {\n  try {\n    const result = await promise;\n    return result;\n  } catch (err) {\n    console.error('Error:', err);\n    throw err;\n  }\n}`,
        },
        {
          fix: 'Add unhandled rejection handler at app entry',
          example: `process.on('unhandledRejection', (err) => {\n  console.error('Unhandled Rejection:', err);\n});`,
        },
      ],
      autoFixAvailable: false,
      reason: 'Promise errors need proper error handling',
    };
  }

  /**
   * Apply a fix to a file
   */
  async applyFix(filePath, fixType, error) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let fixedContent = content;
      let applied = false;

      switch (fixType) {
        case 'type':
        case 'undefined':
        case 'null':
          // Add optional chaining
          fixedContent = this.addOptionalChaining(content, error);
          applied = fixedContent !== content;
          break;

        case 'module':
          // Cannot auto-fix module paths without more context
          applied = false;
          break;

        case 'promise':
          // Add try/catch wrapper
          fixedContent = this.addTryCatch(content, error);
          applied = fixedContent !== content;
          break;

        default:
          applied = false;
      }

      if (applied) {
        // Create backup
        const backupPath = `${filePath}.backup`;
        fs.copyFileSync(filePath, backupPath);

        // Write fixed content
        fs.writeFileSync(filePath, fixedContent);

        return {
          success: true,
          filePath,
          backupPath,
          changes: 'Content modified',
        };
      }

      return {
        success: false,
        filePath,
        reason: 'Fix not applicable or could not be auto-applied',
      };
    } catch (err) {
      return {
        success: false,
        filePath,
        error: err.message,
      };
    }
  }

  /**
   * Add optional chaining to fix undefined/null errors
   */
  addOptionalChaining(content, error) {
    // This is a simplified example - real implementation would parse AST
    // For now, return unchanged content as this requires careful analysis
    return content;
  }

  /**
   * Add try/catch wrapper to functions
   */
  addTryCatch(content, error) {
    // This is a simplified example - real implementation would parse AST
    return content;
  }

  /**
   * Generate complete fix report
   */
  generateFixReport(errors) {
    const report = {
      totalErrors: errors.length,
      fixableErrors: 0,
      requiresManual: 0,
      fixes: [],
      commands: [],
    };

    for (const error of errors) {
      const analysis = this.analyzeError(error);

      if (analysis.confidence > 0.6) {
        report.fixableErrors++;
        report.fixes.push({
          error: error.message,
          type: analysis.type,
          priority: analysis.priority,
          suggestion: analysis.suggestion,
          autoFixAvailable: error.type === 'module',
        });

        if (error.type === 'module') {
          const moduleMatch = error.message.match(/['"]([^'"]+)['"]/);
          if (moduleMatch) {
            report.commands.push(`npm install ${moduleMatch[1]}`);
          }
        }
      } else {
        report.requiresManual++;
      }
    }

    return report;
  }
}

module.exports = { ErrorAutoFixer };