      el.innerHTML = readyBounties.map(b => {
        const submitted = b.status === 'SUBMITTED' || b.status === 'SIMULATED_SUBMITTED';
        const analysisObj = typeof b.analysis === 'string' ? JSON.parse(b.analysis || '{}') : (b.analysis || {});
        const isAuto = b.status === 'AUTO_APPROVED_LOW_BUDGET' || analysisObj.autoAccepted;
        const platform = b.bounty_platform || b.platform || 'github';
        const platformLabels = { github: 'GitHub', gitcoin: 'Gitcoin', algora: 'Algora', freelancer: 'Freelancer' };
        const score = analysisObj.score || 0;
        const scoreClass = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';

        return `
          <div class="card ${submitted ? 'submitted' : ''} ${isAuto ? 'auto-active' : ''}">
            <div class="card-platform"><span class="platform-dot ${platform}"></span> ${platformLabels[platform] || 'GitHub'}</div>
            ${submitted ? '<span class="card-status-badge submitted">Đã Nộp</span>' :
              isAuto ? '<span class="card-status-badge auto">🤖 Tự Động</span>' :
              '<span class="card-status-badge new">Mới</span>'}
            <div class="card-title">${b.title}</div>
            <div class="card-meta">
              ${b.github_repo ? `<span>${b.github_repo}</span>` : b.client_name ? `<span>👤 ${b.client_name}</span>` : ''}
            </div>
            <div class="card-amount ${b.budget > 0 ? '' : 'zero'}">${b.budget > 0 ? `$${b.budget}` : 'Chưa xác định'}</div>
            <div class="card-score">
              <div class="score-bar"><div class="score-fill ${scoreClass}" style="width:${score}%"></div></div>
              <span class="score-label">${score}/100</span>
            </div>
            <button class="btn-card ${submitted ? 'submitted-btn' : isAuto ? 'auto-btn' : 'github-btn'}"
              onclick="${submitted || isAuto ? '' : `submitBounty('${b.id}')`}" ${submitted || isAuto ? 'disabled' : ''}>
              ${submitted ? 'Đã Nộp' : isAuto ? 'Đang Xử Lý...' : 'Nộp'}
            </button>
          </div>`;
      }).join('');
    }