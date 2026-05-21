const { GitHubAPI } = require('../backend/services/githubAPI');
const { SmartRequirementAnalyzer } = require('../backend/services/smartRequirementAnalyzer');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function findEasyBounties() {
  const github = new GitHubAPI();
  const analyzer = new SmartRequirementAnalyzer();
  
  console.log('🔍 Searching for "easy" bounty issues on GitHub...');
  
  const searchQueries = [
    'label:"good first issue" bounty is:issue is:open',
    'label:easy bounty is:issue is:open',
    'label:documentation bounty is:issue is:open',
    'bounty reward "good first issue" is:issue is:open',
    'algora bounty is:issue is:open',
    'gitcoin bounty is:issue is:open'
  ];
  
  const allIssues = [];
  const seenUrls = new Set();
  
  for (const q of searchQueries) {
    try {
      console.log(`📡 Searching: ${q}`);
      const response = await require('axios').get('https://api.github.com/search/issues', {
        params: { q, per_page: 20 },
        headers: {
          'Authorization': process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : '',
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.data && response.data.items) {
        for (const item of response.data.items) {
          if (!seenUrls.has(item.html_url)) {
            seenUrls.add(item.html_url);
            allIssues.push(item);
          }
        }
      }
    } catch (err) {
      console.error(`❌ Search failed for "${q}":`, err.message);
    }
  }
  
  console.log(`\n✅ Found ${allIssues.length} unique potential bounty issues.`);
  console.log('📊 Analyzing for "easiest to reward"...');
  
  const analyzedIssues = allIssues.map(issue => {
    const analysis = analyzer.analyze(issue.title, issue.body || '');
    
    let easinessScore = 0;
    if (analysis.complexity === 'easy') easinessScore += 50;
    if (analysis.complexity === 'medium') easinessScore += 20;
    
    if (analysis.taskType === 'documentation') easinessScore += 30;
    if (analysis.taskType === 'bug_fix') easinessScore += 10;
    
    const labels = issue.labels.map(l => l.name.toLowerCase());
    if (labels.includes('good first issue')) easinessScore += 20;
    if (labels.includes('documentation')) easinessScore += 15;
    
    easinessScore -= (issue.comments * 2);
    
    return {
      title: issue.title,
      url: issue.html_url,
      labels: labels,
      complexity: analysis.complexity,
      taskType: analysis.taskType,
      confidence: analysis.confidence,
      comments: issue.comments,
      easinessScore,
      analysis
    };
  });
  
  analyzedIssues.sort((a, b) => b.easinessScore - a.easinessScore);
  
  console.log('\n🏆 TOP 5 EASIEST BOUNTIES:');
  analyzedIssues.slice(0, 5).forEach((issue, i) => {
    console.log(`${i+1}. [Score: ${issue.easinessScore}] ${issue.title}`);
    console.log(`   Type: ${issue.taskType} | Complexity: ${issue.complexity} | Comments: ${issue.comments}`);
    console.log(`   URL: ${issue.url}`);
    console.log('---');
  });
  
  if (analyzedIssues.length > 0) {
    const best = analyzedIssues[0];
    console.log(`\n🎯 RECOMMENDATION: ${best.title}`);
    console.log(`Reason: High easiness score (${best.easinessScore}) and matching skills.`);
  } else {
    console.log('\n❌ No suitable easy bounties found at the moment.');
  }
}

findEasyBounties();
