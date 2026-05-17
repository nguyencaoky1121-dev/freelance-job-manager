const fs = require('fs');
const path = require('path');

class CodeGeneratorEngine {
  constructor() {
    this.templates = this.loadTemplates();
  }

  loadTemplates() {
    return {
      'react_component': `import React, { useState } from 'react';
import styles from './{{componentName}}.module.css';

export function {{ComponentName}}() {
  const [state, setState] = useState(null);

  const handleChange = (e) => {
    setState(e.target.value);
  };

  return (
    <div className={styles.container}>
      <h1>{{ComponentName}}</h1>
      {/* Component content */}
    </div>
  );
}

export default {{ComponentName}};`,

      'react_component_test': `import { render, screen } from '@testing-library/react';
import {{ComponentName}} from './{{componentName}}';

describe('{{ComponentName}}', () => {
  it('renders without crashing', () => {
    render(<{{ComponentName}} />);
    expect(screen.getByText('{{ComponentName}}')).toBeInTheDocument();
  });

  it('handles user interactions', () => {
    render(<{{ComponentName}} />);
    // Add interaction tests
  });
});`,

      'express_api': `const express = require('express');
const router = express.Router();

/**
 * GET /api/{{resource}}
 */
router.get('/', async (req, res) => {
  try {
    // TODO: Implement GET logic
    res.json({ success: true, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/{{resource}}
 */
router.post('/', async (req, res) => {
  try {
    // TODO: Implement POST logic
    res.json({ success: true, message: 'Created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/{{resource}}/:id
 */
router.get('/:id', async (req, res) => {
  try {
    // TODO: Implement GET by ID logic
    res.json({ success: true, data: null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/{{resource}}/:id
 */
router.put('/:id', async (req, res) => {
  try {
    // TODO: Implement PUT logic
    res.json({ success: true, message: 'Updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/{{resource}}/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    // TODO: Implement DELETE logic
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;`,

      'express_api_test': `const request = require('supertest');
const app = require('../app');

describe('{{Resource}} API', () => {
  it('GET /api/{{resource}} returns list', async () => {
    const res = await request(app).get('/api/{{resource}}');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/{{resource}} creates item', async () => {
    const res = await request(app)
      .post('/api/{{resource}}')
      .send({ /* test data */ });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/{{resource}}/:id returns item', async () => {
    const res = await request(app).get('/api/{{resource}}/1');
    expect(res.status).toBe(200);
  });

  it('PUT /api/{{resource}}/:id updates item', async () => {
    const res = await request(app)
      .put('/api/{{resource}}/1')
      .send({ /* updated data */ });
    expect(res.status).toBe(200);
  });

  it('DELETE /api/{{resource}}/:id deletes item', async () => {
    const res = await request(app).delete('/api/{{resource}}/1');
    expect(res.status).toBe(200);
  });
});`,

      'database_model': `const { run, all, get } = require('../db/database');

class {{ModelName}} {
  static async create(data) {
    try {
      const result = await run(
        'INSERT INTO {{table}} ({{columns}}) VALUES ({{placeholders}})',
        [{{values}}]
      );
      return { success: true, id: result.id };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  static async findAll() {
    try {
      const rows = await all('SELECT * FROM {{table}}');
      return { success: true, data: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  static async findById(id) {
    try {
      const row = await get('SELECT * FROM {{table}} WHERE id = ?', [id]);
      return { success: true, data: row };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  static async update(id, data) {
    try {
      await run(
        'UPDATE {{table}} SET {{updates}} WHERE id = ?',
        [{{values}}, id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  static async delete(id) {
    try {
      await run('DELETE FROM {{table}} WHERE id = ?', [id]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = {{ModelName}};`,

      'bug_fix_template': `// Bug Fix: {{bugDescription}}
// Issue: {{issue}}
// Solution: {{solution}}

// BEFORE (buggy code):
// {{beforeCode}}

// AFTER (fixed code):
{{fixedCode}}

// Test to verify fix:
{{testCode}}`,

      'refactor_template': `// Refactoring: {{refactorDescription}}
// Improvements:
// - {{improvement1}}
// - {{improvement2}}
// - {{improvement3}}

// BEFORE (old code):
// {{beforeCode}}

// AFTER (refactored code):
{{refactoredCode}}`,
    };
  }

  /**
   * Generate code based on analysis
   */
  generateCode(analysis, issueDescription) {
    const { taskType, techStack, requiredSkills } = analysis;

    let code = '';
    let fileName = '';

    // Determine what to generate based on task type and tech stack
    if (taskType === 'bug_fix') {
      code = this.generateBugFix(analysis, issueDescription);
      fileName = 'bugfix.js';
    } else if (taskType === 'feature') {
      if (techStack.includes('frontend')) {
        code = this.generateReactComponent(analysis);
        fileName = 'Component.jsx';
      } else if (techStack.includes('backend')) {
        code = this.generateExpressAPI(analysis);
        fileName = 'api.js';
      } else {
        code = this.generateFullStackFeature(analysis);
        fileName = 'feature.js';
      }
    } else if (taskType === 'refactor') {
      code = this.generateRefactoring(analysis, issueDescription);
      fileName = 'refactored.js';
    } else if (taskType === 'test') {
      code = this.generateTests(analysis);
      fileName = 'test.js';
    } else {
      code = this.generateGenericSolution(analysis);
      fileName = 'solution.js';
    }

    return {
      code,
      fileName,
      language: this.detectLanguage(fileName),
    };
  }

  generateReactComponent(analysis) {
    let code = this.templates.react_component;
    const componentName = this.toPascalCase(analysis.mainObjective.split(' ')[0]);

    code = code.replace(/{{ComponentName}}/g, componentName);
    code = code.replace(/{{componentName}}/g, this.toCamelCase(componentName));

    return code;
  }

  generateExpressAPI(analysis) {
    let code = this.templates.express_api;
    const resource = this.extractResourceName(analysis.mainObjective);

    code = code.replace(/{{resource}}/g, resource);
    code = code.replace(/{{Resource}}/g, this.toPascalCase(resource));

    return code;
  }

  generateBugFix(analysis, issueDescription) {
    let code = this.templates.bug_fix_template;

    code = code.replace('{{bugDescription}}', analysis.mainObjective);
    code = code.replace('{{issue}}', issueDescription.substring(0, 100));
    code = code.replace('{{solution}}', analysis.suggestedApproach.split('\n')[0]);
    code = code.replace('{{beforeCode}}', '// Original buggy implementation');
    code = code.replace('{{fixedCode}}', '// Fixed implementation\n// TODO: Implement fix');
    code = code.replace('{{testCode}}', '// TODO: Add test to verify fix');

    return code;
  }

  generateRefactoring(analysis, issueDescription) {
    let code = this.templates.refactor_template;

    code = code.replace('{{refactorDescription}}', analysis.mainObjective);
    code = code.replace('{{improvement1}}', 'Improved code clarity');
    code = code.replace('{{improvement2}}', 'Better error handling');
    code = code.replace('{{improvement3}}', 'Enhanced performance');
    code = code.replace('{{beforeCode}}', '// Original implementation');
    code = code.replace('{{refactoredCode}}', '// Refactored implementation\n// TODO: Implement refactoring');

    return code;
  }

  generateTests(analysis) {
    if (analysis.techStack.includes('frontend')) {
      return this.templates.react_component_test;
    } else if (analysis.techStack.includes('backend')) {
      return this.templates.express_api_test;
    }

    return `// Test suite for {{feature}}
describe('{{Feature}}', () => {
  it('should work correctly', () => {
    // TODO: Add test
  });
});`;
  }

  generateFullStackFeature(analysis) {
    return `// Full-stack feature: ${analysis.mainObjective}
//
// This feature includes:
// - Frontend component
// - Backend API
// - Database model
// - Tests

// TODO: Implement full-stack feature
// 1. Create React component
// 2. Create Express API endpoints
// 3. Create database model
// 4. Add tests
// 5. Integrate frontend with backend`;
  }

  generateGenericSolution(analysis) {
    return `// Solution: ${analysis.mainObjective}
//
// Approach:
${analysis.suggestedApproach}
//
// TODO: Implement solution`;
  }

  // Helper methods
  toPascalCase(str) {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  toCamelCase(str) {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  extractResourceName(text) {
    const words = text.split(/\s+/);
    return words[0]?.toLowerCase() || 'resource';
  }

  detectLanguage(fileName) {
    if (fileName.endsWith('.jsx')) return 'jsx';
    if (fileName.endsWith('.js')) return 'javascript';
    if (fileName.endsWith('.ts')) return 'typescript';
    if (fileName.endsWith('.tsx')) return 'tsx';
    return 'javascript';
  }
}

module.exports = { CodeGeneratorEngine };
