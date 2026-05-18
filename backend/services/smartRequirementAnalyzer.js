const { all, run, get } = require('../db/database');

class SmartRequirementAnalyzer {
  constructor() {
    this.taskPatterns = {
      'bug_fix': {
        keywords: ['fix', 'bug', 'issue', 'error', 'broken', 'crash', 'not working', 'problem'],
        difficulty: 'medium',
      },
      'feature': {
        keywords: ['add', 'implement', 'create', 'build', 'new feature', 'functionality'],
        difficulty: 'hard',
      },
      'refactor': {
        keywords: ['refactor', 'improve', 'optimize', 'clean up', 'restructure', 'rewrite'],
        difficulty: 'medium',
      },
      'documentation': {
        keywords: ['document', 'readme', 'guide', 'tutorial', 'comment', 'explain'],
        difficulty: 'easy',
      },
      'test': {
        keywords: ['test', 'unit test', 'integration test', 'e2e', 'coverage'],
        difficulty: 'medium',
      },
      'asset_creation': {
        keywords: ['pixel art', 'image', 'design', 'graphic', 'art', 'create asset', 'generate image', 'logo', 'banner', 'ui design', 'ux', 'mockup', 'flyer', 'business card', 'thumbnail', 'icon', 'svg', 'illustration'],
        difficulty: 'easy',
      },
    };

    this.techStack = {
      'frontend': {
        keywords: ['react', 'vue', 'angular', 'html', 'css', 'javascript', 'typescript', 'ui', 'component', 'page'],
        skills: ['React', 'Vue', 'Angular', 'HTML', 'CSS', 'JavaScript', 'TypeScript'],
      },
      'backend': {
        keywords: ['node', 'express', 'api', 'server', 'database', 'sql', 'mongodb', 'rest', 'endpoint'],
        skills: ['Node.js', 'Express', 'API', 'Database', 'SQL', 'MongoDB'],
      },
      'fullstack': {
        keywords: ['full stack', 'fullstack', 'mern', 'mean', 'lamp'],
        skills: ['React', 'Node.js', 'Express', 'MongoDB', 'SQL'],
      },
      'devops': {
        keywords: ['docker', 'kubernetes', 'ci/cd', 'deploy', 'infrastructure', 'aws', 'gcp'],
        skills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS'],
      },
    };

    this.complexityFactors = {
      'easy': {
        keywords: ['simple', 'basic', 'quick', 'easy', 'minimal', 'small', 'typo', 'one line'],
        maxHours: 2,
        maxBudget: 50,
      },
      'medium': {
        keywords: ['moderate', 'standard', 'typical', 'normal', 'several', 'multiple'],
        maxHours: 8,
        maxBudget: 200,
      },
      'hard': {
        keywords: ['complex', 'difficult', 'advanced', 'challenging', 'comprehensive', 'large scale'],
        maxHours: 40,
        maxBudget: 1000,
      },
    };
  }

  /**
   * Analyze requirement and extract structured data
   */
  analyze(title, description, budget = 0) {
    const text = `${title} ${description}`.toLowerCase();

    return {
      taskType: this.detectTaskType(text),
      techStack: this.detectTechStack(text),
      complexity: this.estimateComplexity(text, budget),
      requiredSkills: this.extractSkills(text),
      estimatedHours: this.estimateHours(text, budget),
      mainObjective: this.extractObjective(title, description),
      acceptanceCriteria: this.extractCriteria(description),
      filesThatNeedChanges: this.predictFiles(text),
      testingStrategy: this.suggestTesting(text),
      suggestedApproach: this.suggestApproach(text),
      confidence: this.calculateConfidence(text),
    };
  }

  detectTaskType(text) {
    for (const [type, pattern] of Object.entries(this.taskPatterns)) {
      if (pattern.keywords.some(kw => text.includes(kw))) {
        return type;
      }
    }
    return 'feature';
  }

  detectTechStack(text) {
    const detected = [];
    for (const [stack, pattern] of Object.entries(this.techStack)) {
      if (pattern.keywords.some(kw => text.includes(kw))) {
        detected.push(stack);
      }
    }
    return detected.length > 0 ? detected : ['fullstack'];
  }

  estimateComplexity(text, budget) {
    let score = 0;

    // Budget-based
    if (budget > 500) score += 3;
    else if (budget > 200) score += 2;
    else if (budget > 50) score += 1;

    // Keyword-based
    // Add style keywords to complexity factors
    for (const style of ['glassmorphism', 'neo-brutalism', 'dark luxury', 'minimalist', 'vintage']) {
      if (text.includes(style)) {
        score += 1; // Increase score for specific styles
      }
    }

    for (const [level, factors] of Object.entries(this.complexityFactors)) {
      const matches = factors.keywords.filter(kw => text.includes(kw)).length;
      if (matches > 0) {
        if (level === 'easy') score -= matches;
        else if (level === 'medium') score += matches * 0.5;
        else if (level === 'hard') score += matches * 2;
      }
    }

    if (score <= 1) return 'easy';
    if (score <= 3) return 'medium';
    return 'hard';
  }

  extractSkills(text) {
    const skills = new Set();
    for (const stack of Object.values(this.techStack)) {
      if (stack.keywords.some(kw => text.includes(kw))) {
        stack.skills.forEach(s => skills.add(s));
      }
    }
    return Array.from(skills);
  }

  estimateHours(text, budget) {
    const complexity = this.estimateComplexity(text, budget);
    const baseHours = {
      'easy': 2,
      'medium': 8,
      'hard': 20,
    };

    let hours = baseHours[complexity] || 8;

    // Adjust based on keywords
    if (text.includes('multiple') || text.includes('several')) hours *= 1.5;
    if (text.includes('comprehensive') || text.includes('full')) hours *= 2;
    if (text.includes('quick') || text.includes('simple')) hours *= 0.5;

    return Math.min(Math.max(hours, 1), 40);
  }

  extractObjective(title, description) {
    // Extract first sentence or title
    const sentences = description.split(/[.!?]/);
    return sentences[0]?.trim() || title;
  }

  extractCriteria(description) {
    const criteria = [];

    // Look for numbered lists
    const numbered = description.match(/\d+\.\s+([^\n]+)/g);
    if (numbered) {
      criteria.push(...numbered.map(n => n.replace(/^\d+\.\s+/, '')));
    }

    // Look for bullet points
    const bullets = description.match(/[-*]\s+([^\n]+)/g);
    if (bullets) {
      criteria.push(...bullets.map(b => b.replace(/^[-*]\s+/, '')));
    }

    // Look for "Acceptance Criteria" section
    const acMatch = description.match(/acceptance criteria:?\s*\n?([\s\S]*?)(?:\n\n|$)/i);
    if (acMatch) {
      const acText = acMatch[1];
      const items = acText.split(/\n/).filter(l => l.trim());
      criteria.push(...items.map(i => i.replace(/^[-*]\s+/, '').trim()));
    }

    return criteria.length > 0 ? criteria : ['Complete the task as described'];
  }

  predictFiles(text) {
    const files = [];

    // Predict based on tech stack
    if (text.includes('react') || text.includes('component')) {
      files.push('src/components/Component.jsx', 'src/components/Component.test.jsx');
    }
    if (text.includes('api') || text.includes('endpoint')) {
      files.push('src/routes/api.js', 'src/controllers/controller.js');
    }
    if (text.includes('database') || text.includes('model')) {
      files.push('src/models/Model.js', 'src/migrations/migration.js');
    }
    if (text.includes('style') || text.includes('css')) {
      files.push('src/styles/style.css', 'src/components/Component.module.css');
    }
    if (text.includes('test')) {
      files.push('src/__tests__/test.js', 'src/__tests__/integration.test.js');
    }

    return files.length > 0 ? files : ['src/index.js'];
  }

  suggestTesting(text) {
    if (text.includes('api') || text.includes('endpoint')) {
      return 'Test API endpoints with Jest/Supertest. Verify status codes, response format, error handling.';
    }
    if (text.includes('component') || text.includes('react')) {
      return 'Test React components with React Testing Library. Verify rendering, user interactions, state changes.';
    }
    if (text.includes('database')) {
      return 'Test database operations with integration tests. Verify CRUD operations, transactions, constraints.';
    }
    return 'Write unit tests covering all functions and edge cases. Aim for 80%+ coverage.';
  }

  suggestApproach(text) {
    const steps = [];

    if (text.includes('bug')) {
      steps.push('1. Reproduce the bug with a test case');
      steps.push('2. Identify root cause');
      steps.push('3. Implement fix');
      steps.push('4. Verify fix with test');
    } else if (text.includes('feature') || text.includes('add')) {
      steps.push('1. Design the feature structure');
      steps.push('2. Create necessary files/components');
      steps.push('3. Implement core functionality');
      steps.push('4. Add tests');
      steps.push('5. Handle edge cases');
    } else if (text.includes('refactor')) {
      steps.push('1. Understand current implementation');
      steps.push('2. Plan refactoring strategy');
      steps.push('3. Refactor incrementally');
      steps.push('4. Verify tests still pass');
      steps.push('5. Update documentation');
    } else {
      steps.push('1. Understand requirements');
      steps.push('2. Plan implementation');
      steps.push('3. Implement solution');
      steps.push('4. Test thoroughly');
      steps.push('5. Document changes');
    }

    return steps.join('\n');
  }

  calculateConfidence(text) {
    let confidence = 0.5; // Base confidence

    // Increase confidence if requirements are clear
    if (text.length > 200) confidence += 0.1;
    if (text.includes('acceptance criteria')) confidence += 0.1;
    if (text.includes('example') || text.includes('screenshot')) confidence += 0.1;

    // Specific design keywords (style, color, etc.) increase confidence
    const designKeywords = ['glassmorphism', 'neo-brutalism', 'dark luxury', 'palette', 'hex', 'color', 'pixel', 'size', 'dimension'];
    const designMatches = designKeywords.filter(kw => text.includes(kw)).length;
    if (designMatches > 0) confidence += 0.1;

    // Decrease confidence if vague
    if (text.includes('maybe') || text.includes('possibly')) confidence -= 0.1;
    if (text.includes('unclear') || text.includes('not sure')) confidence -= 0.2;

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Decide if we should accept this bounty
   */
  shouldAccept(analysis, userSkills = []) {
    // Check skills match
    const hasSkills = analysis.requiredSkills.some(skill =>
      userSkills.some(us => us.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(us.toLowerCase()))
    );

    // Check complexity is acceptable
    const acceptableComplexity = ['easy', 'medium'].includes(analysis.complexity);

    // Check time is reasonable
    const reasonableTime = analysis.estimatedHours <= 40;

    // Check confidence is high enough
    const goodConfidence = analysis.confidence >= 0.4;

    return hasSkills && acceptableComplexity && reasonableTime && goodConfidence;
  }
}

module.exports = { SmartRequirementAnalyzer };
