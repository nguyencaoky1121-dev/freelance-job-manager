const { SmartRequirementAnalyzer } = require('./smartRequirementAnalyzer');

class AdvancedRequirementAnalyzer extends SmartRequirementAnalyzer {
  /**
   * Deep parse GitHub issue to extract real requirements
   */
  parseGitHubIssue(title, description, comments = []) {
    const baseAnalysis = this.analyze(title, description);

    // Extract structured requirements from description
    const requirements = this.extractStructuredRequirements(description);

    // Extract acceptance criteria
    const acceptanceCriteria = this.extractAcceptanceCriteria(description);

    // Extract file paths mentioned in issue
    const mentionedFiles = this.extractFilePaths(description, comments);

    // Extract code examples or snippets
    const codeExamples = this.extractCodeExamples(description, comments);

    // Analyze comments for additional context
    const commentAnalysis = this.analyzeComments(comments);

    // Detect if this is a real task or vague request
    const taskClarity = this.assessTaskClarity(description, acceptanceCriteria, codeExamples);

    // Extract budget if mentioned
    const budget = this.extractBudget(description, title);

    return {
      ...baseAnalysis,
      requirements,
      acceptanceCriteria,
      mentionedFiles,
      codeExamples,
      commentAnalysis,
      taskClarity,
      budget,
      // NEW: Categorize the work strategy
      workCategory: this.determineWorkCategory(budget, taskClarity.score, baseAnalysis.taskType),
      isRealTask: taskClarity.score >= 0.6 && budget > 0,
      shouldAutoExecute: budget > 0 && budget < 50 && taskClarity.score >= 0.6,
    };
  }

  /**
   * Determine the best work strategy for this bounty
   */
  determineWorkCategory(budget, clarity, taskType) {
    if (budget >= 100 || (budget > 50 && clarity > 0.8)) {
      return 'STRATEGIC'; // High value, needs perfect execution
    }
    if (budget === 0 || (budget < 20 && taskType === 'documentation')) {
      return 'BRAND'; // Low value, focus on profile building
    }
    return 'AUTO'; // Medium value, focus on speed and quantity
  }

  /**
   * Extract structured requirements from description
   */
  extractStructuredRequirements(description) {
    const requirements = [];

    // Look for "Requirements:" section
    const reqMatch = description.match(/requirements?:?\s*\n?([\s\S]*?)(?:\n\n|acceptance|$)/i);
    if (reqMatch) {
      const reqText = reqMatch[1];
      const items = reqText.split(/\n/).filter(l => l.trim());
      requirements.push(...items.map(i => i.replace(/^[-*\d.)\s]+/, '').trim()).filter(i => i));
    }

    // Look for numbered lists
    const numbered = description.match(/\d+\.\s+([^\n]+)/g);
    if (numbered) {
      requirements.push(...numbered.map(n => n.replace(/^\d+\.\s+/, '')));
    }

    // Look for bullet points
    const bullets = description.match(/[-*]\s+([^\n]+)/g);
    if (bullets) {
      requirements.push(...bullets.map(b => b.replace(/^[-*]\s+/, '')));
    }

    return requirements;
  }

  /**
   * Extract acceptance criteria
   */
  extractAcceptanceCriteria(description) {
    const criteria = [];

    // Look for "Acceptance Criteria" section
    const acMatch = description.match(/acceptance\s+criteria:?\s*\n?([\s\S]*?)(?:\n\n|$)/i);
    if (acMatch) {
      const acText = acMatch[1];
      const items = acText.split(/\n/).filter(l => l.trim());
      criteria.push(...items.map(i => i.replace(/^[-*\d.)\s]+/, '').trim()).filter(i => i));
    }

    return criteria;
  }

  /**
   * Extract file paths mentioned in issue
   */
  extractFilePaths(description, comments = []) {
    const files = new Set();
    const fullText = `${description} ${comments.map(c => c.body).join(' ')}`;

    // Match common file path patterns
    const patterns = [
      /`([a-zA-Z0-9/_.-]+\.(tsx?|jsx?|css|html|json|md))`/g,
      /\[([a-zA-Z0-9/_.-]+\.(tsx?|jsx?|css|html|json|md))\]/g,
      /src\/[a-zA-Z0-9/_.-]+\.(tsx?|jsx?|css|html|json|md)/g,
      /components\/[a-zA-Z0-9/_.-]+\.(tsx?|jsx?)/g,
      /pages\/[a-zA-Z0-9/_.-]+\.(tsx?|jsx?)/g,
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(fullText)) !== null) {
        files.add(match[1] || match[0]);
      }
    });

    return Array.from(files);
  }

  /**
   * Extract code examples from issue
   */
  extractCodeExamples(description, comments = []) {
    const examples = [];
    const fullText = `${description} ${comments.map(c => c.body).join('\n')}`;

    // Match code blocks
    const codeBlockPattern = /```(?:tsx?|jsx?|javascript|typescript)?\n([\s\S]*?)```/g;
    let match;
    while ((match = codeBlockPattern.exec(fullText)) !== null) {
      examples.push({
        code: match[1].trim(),
        type: 'code_block',
      });
    }

    // Match inline code
    const inlinePattern = /`([^`]{20,})`/g;
    while ((match = inlinePattern.exec(fullText)) !== null) {
      if (match[1].includes('function') || match[1].includes('const') || match[1].includes('=>')) {
        examples.push({
          code: match[1],
          type: 'inline_code',
        });
      }
    }

    return examples;
  }

  /**
   * Analyze comments for additional context
   */
  analyzeComments(comments = []) {
    const analysis = {
      totalComments: comments.length,
      hasAuthorComments: false,
      hasReviewComments: false,
      clarifications: [],
      feedback: [],
    };

    comments.forEach(comment => {
      const body = comment.body.toLowerCase();

      if (body.includes('clarif') || body.includes('question')) {
        analysis.clarifications.push(comment.body);
      }

      if (body.includes('feedback') || body.includes('suggest') || body.includes('consider')) {
        analysis.feedback.push(comment.body);
      }

      if (comment.author_association === 'OWNER') {
        analysis.hasAuthorComments = true;
      }

      if (body.includes('review') || body.includes('approved') || body.includes('changes requested')) {
        analysis.hasReviewComments = true;
      }
    });

    return analysis;
  }

  /**
   * Assess how clear and specific the task is
   */
  assessTaskClarity(description, acceptanceCriteria, codeExamples) {
    let score = 0;

    // Clear description
    if (description.length > 300) score += 0.2;
    if (description.length > 500) score += 0.1;

    // Has acceptance criteria
    if (acceptanceCriteria.length > 0) score += 0.3;
    if (acceptanceCriteria.length > 3) score += 0.1;

    // Has code examples
    if (codeExamples.length > 0) score += 0.2;

    // Has specific design style requirements
    const designStyles = ['glassmorphism', 'neo-brutalism', 'dark luxury', 'minimalist', 'vintage'];
    if (designStyles.some(style => description.toLowerCase().includes(style))) {
      score += 0.15;
    }

    // Avoid vague language
    const vagueKeywords = ['maybe', 'possibly', 'unclear', 'not sure', 'tbd', 'todo'];
    const vagueCount = vagueKeywords.filter(kw => description.toLowerCase().includes(kw)).length;
    score -= vagueCount * 0.1;

    // Has specific requirements
    if (description.includes('must') || description.includes('should') || description.includes('require')) {
      score += 0.1;
    }

    return {
      score: Math.min(Math.max(score, 0), 1),
      isVague: score < 0.4,
      needsClarification: score < 0.6,
    };
  }

  /**
   * Extract budget from description or title
   */
  extractBudget(description, title) {
    const fullText = `${title} ${description}`;

    // Look for dollar amounts
    const dollarPattern = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
    let match;
    let maxBudget = 0;

    while ((match = dollarPattern.exec(fullText)) !== null) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      maxBudget = Math.max(maxBudget, amount);
    }

    return maxBudget;
  }

  /**
   * Check if request should be excluded
   */
  shouldExclude(title, description) {
    const fullText = `${title} ${description}`.toLowerCase();

    // Exclude personal info requests
    if (fullText.includes('personal') || fullText.includes('private') || fullText.includes('secret')) {
      return { excluded: true, reason: 'Personal information request' };
    }

    // Exclude .env requests
    if (fullText.includes('.env') || fullText.includes('environment variable')) {
      return { excluded: true, reason: '.env file request' };
    }

    // Exclude API key requests
    if (fullText.includes('api key') || fullText.includes('api_key') || fullText.includes('token')) {
      return { excluded: true, reason: 'API key request' };
    }

    // Exclude requests without budget
    const budget = this.extractBudget(description, title);
    if (budget === 0) {
      return { excluded: true, reason: 'No budget defined' };
    }

    return { excluded: false };
  }
}

module.exports = { AdvancedRequirementAnalyzer };
