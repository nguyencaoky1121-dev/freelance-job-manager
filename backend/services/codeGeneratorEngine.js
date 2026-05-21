const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

class CodeGeneratorEngine {
  loadTemplates() {
    return {
      'react_component': `import React, { useState } from 'react';\n\nexport function {{ComponentName}}() {\n  return (\n    <div>\n      <h1>{{ComponentName}}</h1>\n      {/* TODO: Implement logic */}\n    </div>\n  );\n}\nexport default {{ComponentName}};`,
      'express_api': `const express = require('express');\nconst router = express.Router();\n\nrouter.get('/', async (req, res) => {\n  res.json({ success: true });\n});\n\nmodule.exports = router;`,
      'generic_solution': `// Solution: {{mainObjective}}\n// TODO: Implement actual logic based on approach: \n// {{approach}}`
    };
  }

  constructor() {
    this.templates = this.loadTemplates();
    this.apiKeys = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.split(',').map(k => k.trim()) : [];
    this.currentKeyIndex = 0;
    this.aiInstances = this.apiKeys.map(key => new GoogleGenAI({ apiKey: key }));
  }

  /**
   * Get the next available AI instance (Rotation)
   */
  getAI() {
    if (this.aiInstances.length === 0) return null;
    const instance = this.aiInstances[this.currentKeyIndex];
    // Rotate index for next call
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.aiInstances.length;
    return instance;
  }

  /**
   * AI-Powered Code Generation
   */
  async generateCodeWithAI(analysis, issueDescription) {
    const aiInstance = this.getAI();
    if (!aiInstance) {
      console.warn('⚠️ GEMINI_API_KEY is missing. Using static templates as fallback.');
      return this.generateCodeFallback(analysis, issueDescription);
    }

    console.log(`🤖 Generating code using Gemini AI (Key #${this.currentKeyIndex + 1}/${this.apiKeys.length})...`);
    try {
      const prompt = `
      You are an expert Senior Software Engineer participating in a GitHub bounty/freelance job.
      Your task is to write high-quality, production-ready code to solve the following issue.

      ISSUE TITLE: ${analysis.mainObjective}
      TECH STACK: ${analysis.techStack.join(', ')}
      TASK TYPE: ${analysis.taskType}

      ISSUE DESCRIPTION:
      ${issueDescription}

      REQUIREMENTS:
      1. Write REAL, WORKING code. Do NOT use "// TODO: implement this".
      2. If it's a bug fix, provide the fixed code.
      3. If it's a new feature, provide the complete implementation.
      4. Output ONLY the raw code. No markdown code blocks like \`\`\`javascript. No explanations.
      5. Add a short comment at the top explaining what was fixed/added.

      Write the code now:
      `;

      // Use correct SDK pattern for @google/genai
      const model = aiInstance.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let generatedCode = response.text();

      // Clean up markdown block if the AI ignored the instruction
      generatedCode = generatedCode.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');

      let fileName = 'solution.js';
      if (analysis.techStack.includes('frontend')) fileName = 'Component.jsx';
      else if (analysis.techStack.includes('python')) fileName = 'solution.py';
      else if (analysis.techStack.includes('rust')) fileName = 'main.rs';
      else if (analysis.techStack.includes('go')) fileName = 'main.go';

      return {
        code: generatedCode,
        fileName: fileName,
        language: this.detectLanguage(fileName),
        isAI: true
      };

    } catch (error) {
      console.error('❌ AI Generation failed:', error.message);
      console.log('🔄 Falling back to static templates...');
      return this.generateCodeFallback(analysis, issueDescription);
    }
  }

  /**
   * Main entry point (Backward compatible)
   */
  async generateCode(analysis, issueDescription) {
    // If it's an async call, we try AI
    return await this.generateCodeWithAI(analysis, issueDescription);
  }

  /**
   * Fallback using templates (Synchronous)
   */
  generateCodeFallback(analysis, issueDescription) {
    let code = '';
    let fileName = 'solution.js';

    if (analysis.taskType === 'feature' && analysis.techStack.includes('frontend')) {
      code = this.templates.react_component.replace(/{{ComponentName}}/g, 'FeatureComponent');
      fileName = 'Component.jsx';
    } else if (analysis.taskType === 'feature' && analysis.techStack.includes('backend')) {
      code = this.templates.express_api;
      fileName = 'api.js';
    } else {
      code = this.templates.generic_solution
        .replace('{{mainObjective}}', analysis.mainObjective)
        .replace('{{approach}}', analysis.suggestedApproach);
    }

    return {
      code,
      fileName,
      language: this.detectLanguage(fileName),
      isAI: false
    };
  }

  detectLanguage(fileName) {
    if (fileName.endsWith('.jsx')) return 'jsx';
    if (fileName.endsWith('.js')) return 'javascript';
    if (fileName.endsWith('.ts')) return 'typescript';
    if (fileName.endsWith('.tsx')) return 'tsx';
    if (fileName.endsWith('.py')) return 'python';
    if (fileName.endsWith('.rs')) return 'rust';
    if (fileName.endsWith('.go')) return 'go';
    return 'javascript';
  }
}

module.exports = { CodeGeneratorEngine };

