const { all, run, get } = require('../db/database');
const { v4: uuidv4 } = require('crypto');

/**
 * Analyze a job description and extract key information
 */
function analyzeJob(job) {
  const description = (job.description || '').toLowerCase();
  const title = (job.title || '').toLowerCase();
  const combined = `${title} ${description}`;

  // Determine category
  const categories = detectCategories(combined);

  // Estimate complexity
  const complexity = estimateComplexity(combined, job.budget);

  // Extract specific requirements
  const requirements = extractRequirements(combined);

  // Suggest approach
  const approach = suggestApproach(categories, requirements, complexity);

  // Generate proposal draft
  const proposal = generateProposal(job, categories, complexity, approach);

  // Estimate time
  const estimatedHours = estimateTime(complexity, categories);

  return {
    categories,
    complexity,
    requirements,
    approach,
    proposal,
    estimatedHours,
    recommendedBid: calculateRecommendedBid(job.budget, complexity),
    score: calculateJobScore(job, complexity),
  };
}

function detectCategories(text) {
  const categoryMap = {
    'logo': ['logo', 'brand', 'branding', 'identity', 'emblem', 'monogram', 'wordmark'],
    'banner': ['banner', 'header', 'cover', 'hero'],
    'social_media': ['social media', 'instagram', 'facebook', 'twitter', 'post', 'story', 'thumbnail', 'youtube'],
    'web_design': ['website', 'web design', 'landing page', 'homepage', 'ui', 'ux', 'wireframe', 'mockup'],
    'print': ['flyer', 'brochure', 'poster', 'business card', 'card', 'print', 'leaflet'],
    'illustration': ['illustration', 'drawing', 'sketch', 'character', 'mascot', 'cartoon', 'icon'],
    'packaging': ['packaging', 'package', 'label', 'box', 'wrapper'],
    'infographic': ['infographic', 'data visualization', 'chart', 'diagram'],
    'presentation': ['presentation', 'powerpoint', 'slide', 'pitch deck'],
    'email': ['email', 'newsletter', 'email template', 'mailchimp'],
  };

  const detected = [];
  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      detected.push(category);
    }
  }

  return detected.length > 0 ? detected : ['general_design'];
}

function estimateComplexity(text, budget) {
  let score = 0;

  // Budget-based
  if (budget > 200) score += 3;
  else if (budget > 100) score += 2;
  else if (budget > 50) score += 1;

  // Requirements complexity
  const complexKeywords = ['multiple', 'revisions', 'source files', 'brand guide', 'style guide', 'complex', 'detailed', 'professional', 'premium'];
  const simpleKeywords = ['simple', 'basic', 'quick', 'easy', 'minimal', 'clean'];

  complexKeywords.forEach(kw => { if (text.includes(kw)) score += 1; });
  simpleKeywords.forEach(kw => { if (text.includes(kw)) score -= 1; });

  if (score <= 1) return 'easy';
  if (score <= 3) return 'medium';
  return 'hard';
}

function extractRequirements(text) {
  const reqs = {
    fileFormats: [],
    colors: [],
    dimensions: [],
    revisions: 'not specified',
    deadline: 'not specified',
    style: [],
  };

  // File formats
  const formats = ['png', 'jpg', 'jpeg', 'svg', 'pdf', 'ai', 'psd', 'eps', 'figma', 'xd'];
  formats.forEach(f => { if (text.includes(f)) reqs.fileFormats.push(f.toUpperCase()); });

  // Colors
  const colorMatch = text.match(/#[0-9a-f]{3,6}/gi);
  if (colorMatch) reqs.colors = colorMatch;
  if (text.includes('color') && text.includes('blue')) reqs.colors.push('blue');
  if (text.includes('color') && text.includes('red')) reqs.colors.push('red');
  if (text.includes('color') && text.includes('green')) reqs.colors.push('green');

  // Style
  const styles = ['modern', 'vintage', 'retro', 'minimalist', 'elegant', 'playful', 'corporate', 'luxury', 'flat', '3d'];
  styles.forEach(s => { if (text.includes(s)) reqs.style.push(s); });

  // Revisions
  const revMatch = text.match(/(\d+)\s*revision/i);
  if (revMatch) reqs.revisions = revMatch[1];
  if (text.includes('unlimited revision')) reqs.revisions = 'unlimited';

  return reqs;
}

function suggestApproach(categories, requirements, complexity) {
  const approaches = [];

  if (categories.includes('logo')) {
    approaches.push('Create 3 logo concepts with different styles');
    approaches.push('Provide SVG + PNG formats');
    approaches.push('Include brand color variations');
  }
  if (categories.includes('banner') || categories.includes('social_media')) {
    approaches.push('Design responsive banner/post templates');
    approaches.push('Use eye-catching typography and colors');
    approaches.push('Optimize for platform dimensions');
  }
  if (categories.includes('web_design')) {
    approaches.push('Create responsive HTML/CSS layout');
    approaches.push('Focus on UX best practices');
    approaches.push('Include mobile & desktop versions');
  }
  if (categories.includes('print')) {
    approaches.push('Design print-ready files with bleed');
    approaches.push('Use CMYK color mode');
    approaches.push('Include editable source files');
  }

  if (approaches.length === 0) {
    approaches.push('Deliver professional design matching requirements');
    approaches.push('Provide multiple format options');
    approaches.push('Include source files');
  }

  return approaches;
}

function generateProposal(job, categories, complexity, approach) {
  const greeting = `Hi! I'd love to help with your ${categories[0].replace('_', ' ')} project.`;
  const experience = `I'm an experienced designer specializing in ${categories.map(c => c.replace('_', ' ')).join(', ')}.`;
  const plan = `Here's my approach:\n${approach.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
  const timeline = complexity === 'easy' ? '24 hours' : complexity === 'medium' ? '2-3 days' : '3-5 days';
  const closing = `I can deliver within ${timeline}. Let's discuss your vision in detail!`;

  return `${greeting}\n\n${experience}\n\n${plan}\n\n${closing}`;
}

function estimateTime(complexity, categories) {
  const baseHours = { easy: 1, medium: 3, hard: 6 };
  return baseHours[complexity] || 2;
}

function calculateRecommendedBid(budget, complexity) {
  if (!budget || budget <= 0) return 25;

  // Use budget as minimum bid (Freelancer API returns minimum as budget)
  // Add 10% markup for complexity
  const multiplier = { easy: 1.0, medium: 1.1, hard: 1.2 };
  const recommendedBid = Math.round(budget * (multiplier[complexity] || 1.1));

  // Ensure minimum of $25
  return Math.max(25, recommendedBid);
}

function calculateJobScore(job, complexity) {
  let score = 50;

  // Higher budget = better
  if (job.budget >= 100) score += 20;
  else if (job.budget >= 50) score += 10;
  else if (job.budget >= 25) score += 5;

  // Easy jobs are faster to complete
  if (complexity === 'easy') score += 15;
  else if (complexity === 'medium') score += 5;

  // Fewer bids = better chance
  if (job.bidCount !== undefined) {
    if (job.bidCount < 5) score += 20;
    else if (job.bidCount < 15) score += 10;
    else score -= 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Generate auto-reply for client messages
 */
function generateAutoReply(message, jobContext) {
  const msgLower = (message || '').toLowerCase();

  // Detect message type and generate appropriate response
  if (msgLower.includes('revision') || msgLower.includes('change') || msgLower.includes('modify') || msgLower.includes('update')) {
    return `Thank you for your feedback! I'd be happy to make those revisions. Could you please specify:\n\n1. What exactly needs to be changed?\n2. Any reference images or examples?\n\nI'll get the updated version to you quickly!`;
  }

  if (msgLower.includes('deadline') || msgLower.includes('when') || msgLower.includes('how long') || msgLower.includes('time')) {
    return `Great question! Based on the project scope, I estimate I can deliver within 24-48 hours. If you need it sooner, please let me know and I'll prioritize it.`;
  }

  if (msgLower.includes('price') || msgLower.includes('cost') || msgLower.includes('budget') || msgLower.includes('payment')) {
    return `I've quoted a competitive price that reflects the quality I'll deliver. The price includes:\n\n✅ Professional design\n✅ Source files\n✅ Revisions as needed\n\nWould you like to proceed?`;
  }

  if (msgLower.includes('thank') || msgLower.includes('great') || msgLower.includes('good') || msgLower.includes('perfect') || msgLower.includes('love')) {
    return `Thank you so much! I'm glad you're happy with the work! 😊\n\nIf everything looks good, could you please approve the milestone so we can complete the project? Don't hesitate to reach out if you need anything else!`;
  }

  if (msgLower.includes('start') || msgLower.includes('begin') || msgLower.includes('go ahead') || msgLower.includes('proceed')) {
    return `Excellent! I'll start working on your project right away. I'll share the first draft within 24 hours.\n\nIf you have any additional details, references, or preferences, feel free to share them!`;
  }

  // Default response
  return `Thank you for your message! I've reviewed your requirements and I'm ready to help.\n\nCould you share any additional details or reference images? This will help me deliver exactly what you're looking for.\n\nLooking forward to working together!`;
}

module.exports = {
  analyzeJob,
  detectCategories,
  estimateComplexity,
  extractRequirements,
  generateProposal,
  generateAutoReply,
  calculateJobScore,
};
