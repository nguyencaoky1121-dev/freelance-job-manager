const { GitHubAPI } = require('../backend/services/githubAPI');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
  const github = new GitHubAPI();
  console.log("🛠️ Testing GitHub profile access...");
  const result = await github.getUserProfile();
  
  if (result.success) {
    console.log(`✅ GitHub Authenticated as: ${result.user.login}`);
    console.log(`🔗 Profile URL: ${result.user.html_url}`);
  } else {
    console.error(`❌ GitHub Authentication FAILED: ${result.error}`);
  }
}

test();
