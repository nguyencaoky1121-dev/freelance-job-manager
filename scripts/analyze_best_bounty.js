const { GitHubAPI } = require('../backend/services/githubAPI');
const { SmartRequirementAnalyzer } = require('../backend/services/smartRequirementAnalyzer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function analyzeBest() {
  const github = new GitHubAPI();
  const analyzer = new SmartRequirementAnalyzer();
  const targetUrl = 'https://github.com/HavenOnStellar/Haven_Contracts/issues/4';
  
  const urlParts = targetUrl.split('/');
  const owner = urlParts[3];
  const repo = urlParts[4];
  const number = urlParts[6];

  console.log(`🔍 Fetching details for ${owner}/${repo}#${number}...`);
  const details = await github.getIssueDetails(owner, repo, number);
  
  if (details.success) {
    const issue = details.issue;
    console.log(`\n📋 Title: ${issue.title}`);
    console.log(`📝 Description: ${issue.body?.substring(0, 500)}...`);
    
    const analysis = analyzer.analyze(issue.title, issue.body || '');
    console.log('\n🧠 AI ANALYSIS:');
    console.log(JSON.stringify(analysis, null, 2));
    
    console.log('\n💡 RECOMMENDATION:');
    if (analysis.confidence > 0.4) {
      console.log('✅ Pipeline should proceed with this bounty.');
      console.log(`Task Type: ${analysis.taskType}`);
      console.log(`Complexity: ${analysis.complexity}`);
      console.log(`Suggested Approach:\n${analysis.suggestedApproach}`);
    } else {
      console.log('❌ Confidence too low for automatic processing.');
    }
  } else {
    console.error('❌ Failed to fetch issue details.');
  }
}

analyzeBest();
