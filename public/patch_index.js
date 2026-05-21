const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Correct the renderGithubBounties function
const brokenPart = `      el.innerHTML = readyBounties.map(b => {
        const submitted = b.status === 'SUBMITTED' || b.status === 'SIMULATED_SUBMITTED';
        const analysisObj = typeof b.analysis === 'string' ? JSON.parse(b.analysis || '{}') : (b.analysis || {});
        const isAuto = b.status === 'AUTO_APPROVED_LOW_BUDGET' || analysisObj.autoAccepted;
        const platform = b.bounty_platform || b.platform || 'github';
        const platformLabels = { github: 'GitHub', gitcoin: 'Gitcoin', algora: 'Algora', freelancer: 'Freelancer' };
        const score = analysisObj.score || 0;
        const scoreClass = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';

        return \`
          <div class="card \${submitted ? 'submitted' : ''} \${isAuto ? 'auto-active' : ''}">
            <div class="card-platform"><span class="platform-dot \${platform}"></span> \${platformLabels[platform] || 'GitHub'}</div>
            \${submitted ? '<span class="card-status-badge submitted">Đã Nộp</span>' :
              isAuto ? '<span class="card-status-badge auto">🤖 Tự Động</span>' :
              '<span class="card-status-badge new">Mới</span>'}
            <div class="card-title">\${b.title}</div>
            <div class="card-meta">
              \${b.github_repo ? \`<span>\${b.github_repo}</span>\` : b.client_name ? \`<span>👤 \${b.client_name}</span>\` : ''}
            </div>
            <div class="card-amount \${b.budget > 0 ? '' : 'zero'}">\${b.budget > 0 ? '
    }`;

const correctPart = `      el.innerHTML = readyBounties.map(b => {
        const submitted = b.status === 'SUBMITTED' || b.status === 'SIMULATED_SUBMITTED';
        const analysisObj = typeof b.analysis === 'string' ? JSON.parse(b.analysis || '{}') : (b.analysis || {});
        const isAuto = b.status === 'AUTO_APPROVED_LOW_BUDGET' || analysisObj.autoAccepted;
        const platform = b.bounty_platform || b.platform || 'github';
        const platformLabels = { github: 'GitHub', gitcoin: 'Gitcoin', algora: 'Algora', freelancer: 'Freelancer' };
        const score = analysisObj.score || 0;
        const scoreClass = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';

        return \`
          <div class="card \${submitted ? 'submitted' : ''} \${isAuto ? 'auto-active' : ''}">
            <div class="card-platform"><span class="platform-dot \${platform}"></span> \${platformLabels[platform] || 'GitHub'}</div>
            \${submitted ? '<span class="card-status-badge submitted">Đã Nộp</span>' :
              isAuto ? '<span class="card-status-badge auto">🤖 Tự Động</span>' :
              '<span class="card-status-badge new">Mới</span>'}
            <div class="card-title">\${b.title}</div>
            <div class="card-meta">
              \${b.github_repo ? \`<span>\${b.github_repo}</span>\` : b.client_name ? \`<span>👤 \${b.client_name}</span>\` : ''}
            </div>
            <div class="card-amount \${b.budget > 0 ? '' : 'zero'}">\${b.budget > 0 ? \`$\${b.budget}\` : 'Chưa xác định'}</div>
            <div class="card-score">
              <div class="score-bar"><div class="score-fill \${scoreClass}" style="width:\${score}%"></div></div>
              <span class="score-label">\${score}/100</span>
            </div>
            <button class="btn-card \${submitted ? 'submitted-btn' : isAuto ? 'auto-btn' : 'github-btn'}"
              onclick="\${submitted || isAuto ? '' : \`submitBounty('\${b.id}')\`}" \${submitted || isAuto ? 'disabled' : ''}>
              \${submitted ? 'Đã Nộp' : isAuto ? 'Đang Xử Lý...' : 'Nộp'}
            </button>
          </div>\`;
      }).join('');
    }`;

if (content.includes(brokenPart)) {
  content = content.replace(brokenPart, correctPart);
  console.log('✅ Found and corrected renderGithubBounties function');
} else {
  // Let's try exact matching with normalize newlines
  const normContent = content.replace(/\r\n/g, '\n');
  const normBroken = brokenPart.replace(/\r\n/g, '\n');
  const normCorrect = correctPart.replace(/\r\n/g, '\n');
  if (normContent.includes(normBroken)) {
    content = normContent.replace(normBroken, normCorrect);
    console.log('✅ Normalized and corrected renderGithubBounties function');
  } else {
    console.log('❌ Could not find brokenPart in file. Will do regex fallback.');
    // Let's do a regex replacement for the broken part
    const regex = /el\.innerHTML\s*=\s*readyBounties\.map\(b\s*=>\s*\{[\s\S]*?card-amount\s*\$\{b\.budget\s*>\s*0\s*\?\s*''\s*:\s*'zero'\}\">\$\{b\.budget\s*>\s*0\s*\?\s*'\s*\n\s*\}\s*;\n/g;
    if (regex.test(content)) {
      content = content.replace(regex, correctPart + ';\n');
      console.log('✅ Corrected using regex pattern matching');
    } else {
      console.log('❌ Regex pattern match also failed!');
    }
  }
}

// 2. Truncate everything after </html>
const htmlTag = '</html>';
const index = content.indexOf(htmlTag);
if (index !== -1) {
  content = content.substring(0, index + htmlTag.length) + '\n';
  console.log('✅ Truncated everything after </html>');
} else {
  console.log('❌ Could not find </html> tag!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('🚀 Finished patching index.html successfully!');
