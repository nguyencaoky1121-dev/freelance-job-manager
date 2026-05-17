# Freelance Job Manager - Claude Code Integration

## 📋 Project Overview

Hệ thống quản lý công việc freelance tự động với khả năng:
- Quét bounty từ GitHub, Gitcoin, Algora
- Phân tích yêu cầu bằng AI nội bộ (không dùng API bên ngoài)
- Tự động nhận việc, tạo code, và submit PR
- Theo dõi thanh toán và thu nhập

## 🏗️ Architecture

```
backend/
├── server.js                          # Express + WebSocket server
├── db/
│   └── database.js                    # SQLite wrapper
├── services/
│   ├── internalAutoWorkPipeline.js   # Main orchestrator
│   ├── smartRequirementAnalyzer.js   # Rule-based analysis
│   ├── codeGeneratorEngine.js        # Template-based code generation
│   ├── workExecutor.js               # Git automation
│   ├── githubAPI.js                  # GitHub API wrapper
│   ├── jobMonitor.js                 # Background monitoring
│   └── githubSubmissionTracker.js    # PR status tracking
├── routes/
│   ├── jobs.js                       # Job endpoints
│   ├── contests.js                   # Contest endpoints
│   ├── github.js                     # GitHub bounty endpoints
│   ├── autowork.js                   # Autonomous work endpoints
│   └── crypto.js                     # Crypto wallet endpoints
└── db/
    └── jobs.db                       # SQLite database

public/
├── index.html                        # Main dashboard UI
└── styles/                           # CSS files

.env                                  # Environment variables
package.json                          # Dependencies
```

## 🔑 Key Environment Variables

```bash
# GitHub
GITHUB_TOKEN=your_github_token
GITHUB_USERNAME=your_username

# Gemini (optional, currently not used)
GEMINI_API_KEY=your_gemini_key

# Freelancer
FREELANCER_API_KEY=your_freelancer_key
FREELANCER_USERNAME=your_username

# Skills for auto-accept
FREELANCER_USER_SKILLS="React,Node.js,Express,JavaScript,TypeScript"

# Binance (optional)
BINANCE_API_KEY=your_binance_key
BINANCE_SECRET_KEY=your_binance_secret

# Server
PORT=3000
WS_PORT=3002
```

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
npm run db:init
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 4. Start Server
```bash
npm run dev
```

### 5. Open Dashboard
```
http://localhost:3000
```

## 📊 Core Services

### SmartRequirementAnalyzer
- Analyzes bounty requirements using keyword matching
- Detects: task type, tech stack, complexity, required skills
- Calculates confidence score
- Decides whether to accept based on skills match

### CodeGeneratorEngine
- Generates code from templates (no external AI)
- Supports: React components, Express APIs, database models, bug fixes
- Intelligently selects templates based on analysis

### InternalAutoWorkPipeline
- Orchestrates complete workflow: analyze → accept → generate → execute
- Monitors PR status
- Processes multiple bounties in parallel
- Tracks job status in real-time

### WorkExecutor
- Git automation: clone, branch, commit, push, create PR
- Runs tests
- Cleans up temporary workspaces

## 🎯 API Endpoints

### Autowork
- `POST /api/autowork/process-all` - Process all qualified bounties
- `POST /api/autowork/process/:id` - Process single bounty
- `POST /api/autowork/analyze/:id` - Analyze without execution
- `GET /api/autowork/status` - Get pipeline status
- `GET /api/autowork/history` - Get processing history

### GitHub
- `GET /api/github/bounties` - Get GitHub bounties
- `GET /api/github/submissions/all` - Get submitted bounties
- `POST /api/github/submit/:id` - Submit bounty

### Jobs
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs/submit` - Submit job

## 🔄 Workflow

1. **User clicks "▶️ Bắt Đầu"** on dashboard
2. **System fetches** qualified bounties from database
3. **SmartRequirementAnalyzer** analyzes each bounty
4. **System decides** whether to accept based on skills
5. **CodeGeneratorEngine** generates solution code
6. **WorkExecutor** executes: clone → code → test → commit → push → PR
7. **Dashboard updates** in real-time via WebSocket
8. **System monitors** PR status for merges/reviews

## 🛠️ Development Tips

### Adding New Task Types
Edit `backend/services/smartRequirementAnalyzer.js`:
```javascript
this.taskPatterns = {
  'your_type': {
    keywords: ['keyword1', 'keyword2'],
    difficulty: 'medium',
  },
  // ...
}
```

### Adding New Code Templates
Edit `backend/services/codeGeneratorEngine.js`:
```javascript
this.templates = {
  'your_template': `template code here`,
  // ...
}
```

### Adding New API Endpoints
Create new route file in `backend/routes/` and register in `server.js`:
```javascript
const yourRoute = require('./routes/your-route');
app.use('/api/your-route', yourRoute);
```

## 📱 Dashboard Features

- **Real-time job monitoring** via WebSocket
- **Autonomous work control panel** with glassmorphic design
- **Summary metrics** (active jobs, completed, earnings)
- **Processing history** with action buttons
- **Live status updates** every 10 seconds

## 🔐 Security

- No hardcoded secrets (use .env)
- GitHub token required for API calls
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- CORS enabled for localhost

## 📈 Performance

- Parallel bounty processing
- Efficient database queries with indexes
- WebSocket for real-time updates
- Template-based code generation (no API calls)
- Background job monitoring

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000/3002
lsof -ti:3000 | xargs kill -9
```

### Database Errors
```bash
# Reset database
rm backend/db/jobs.db*
npm run db:init
```

### GitHub API Rate Limit
- Wait 1 hour or use authenticated requests
- Check rate limit: `GET /rate_limit`

## 📚 Resources

- [GitHub API Docs](https://docs.github.com/en/rest)
- [Express.js Docs](https://expressjs.com/)
- [WebSocket Docs](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [SQLite Docs](https://www.sqlite.org/docs.html)

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test
3. Commit: `git commit -m "feat: your feature"`
4. Push: `git push origin feature/your-feature`
5. Create Pull Request

## 📝 Notes

- System works entirely with internal logic (no external AI)
- All code generation uses pre-built templates
- Git automation requires valid GitHub token
- WebSocket updates every 10 seconds
- Database auto-creates on first run

---

**Last Updated:** 2026-05-17
**Version:** 1.0.0
