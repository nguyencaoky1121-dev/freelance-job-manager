# 🤖 Tích Hợp Claude Code với Freelance Job Manager

## 📌 Mục Đích

Tích hợp Claude Code (chạy trên máy local) với hệ thống Freelance Job Manager để:
- Phát triển tính năng mới một cách hiệu quả
- Sửa lỗi nhanh chóng
- Tối ưu hóa code
- Tự động hóa các tác vụ lặp lại

## 🚀 Cài Đặt Claude Code

### 1. Cài Đặt Claude Code CLI

```bash
# Trên Windows (PowerShell as Admin)
npm install -g @anthropic-ai/claude-code

# Hoặc trên macOS/Linux
sudo npm install -g @anthropic-ai/claude-code
```

### 2. Xác Thực Claude Code

```bash
claude-code auth
# Sẽ mở trình duyệt để bạn đăng nhập
```

### 3. Mở Project trong Claude Code

```bash
cd "D:\thietke kiem tien"
claude-code .
```

## 📂 Cấu Trúc Project cho Claude Code

```
D:\thietke kiem tien\
├── CLAUDE.md                    # ← Tài liệu dự án (Claude Code đọc tự động)
├── .claude/
│   ├── settings.json           # Cấu hình Claude Code
│   ├── launch.json             # Cấu hình dev server
│   └── rules/                  # Quy tắc code
├── backend/
│   ├── server.js               # Express server
│   ├── services/               # Business logic
│   ├── routes/                 # API endpoints
│   └── db/                     # Database
├── public/
│   └── index.html              # Dashboard UI
└── package.json
```

## ⚙️ Cấu Hình Claude Code

### 1. Tạo `.claude/settings.json`

```json
{
  "model": "claude-opus-4-7",
  "temperature": 0.7,
  "maxTokens": 4096,
  "autoSave": true,
  "autoFormat": true,
  "linter": "eslint",
  "formatter": "prettier",
  "testRunner": "jest",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "npx prettier --write \"$FILE_PATH\"",
        "description": "Format file after edit"
      },
      {
        "matcher": "Write|Edit",
        "command": "npx eslint --fix \"$FILE_PATH\"",
        "description": "Lint file after edit"
      }
    ]
  }
}
```

### 2. Tạo `.claude/launch.json`

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "dev-server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 3000,
      "cwd": "${workspaceFolder}"
    },
    {
      "name": "test",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["test"],
      "port": 0,
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

## 🎯 Quy Trình Làm Việc với Claude Code

### Workflow 1: Phát Triển Tính Năng Mới

```bash
# 1. Mở project
claude-code .

# 2. Mô tả tính năng bạn muốn
# "Thêm tính năng để tự động gửi email khi bounty được hoàn thành"

# 3. Claude Code sẽ:
#    - Phân tích codebase
#    - Đề xuất kiến trúc
#    - Tạo code
#    - Chạy tests
#    - Commit thay đổi

# 4. Review và merge
git log --oneline -5
```

### Workflow 2: Sửa Lỗi

```bash
# 1. Mô tả lỗi
# "Lỗi: API /api/autowork/status trả HTML thay vì JSON"

# 2. Claude Code sẽ:
#    - Tìm nguyên nhân
#    - Sửa lỗi
#    - Chạy tests
#    - Commit fix

# 3. Kiểm tra
curl http://localhost:3000/api/autowork/status
```

### Workflow 3: Tối Ưu Hóa Code

```bash
# 1. Yêu cầu tối ưu hóa
# "Tối ưu hóa hàm loadAutoworkStatus() để nhanh hơn"

# 2. Claude Code sẽ:
#    - Phân tích performance
#    - Refactor code
#    - Chạy benchmarks
#    - Commit improvements
```

## 💡 Các Lệnh Hữu Ích

### Khởi Động Dev Server

```bash
# Từ Claude Code terminal
npm run dev

# Hoặc sử dụng launch config
claude-code launch dev-server
```

### Chạy Tests

```bash
npm test

# Hoặc chỉ test một file
npm test -- backend/services/smartRequirementAnalyzer.test.js
```

### Kiểm Tra Linting

```bash
npm run lint

# Fix linting errors
npm run lint -- --fix
```

### Xem Logs

```bash
# Tail server logs
tail -f /tmp/server.log

# Hoặc từ Claude Code
claude-code logs dev-server
```

## 🔗 Tích Hợp Git

### Commit Tự Động

Claude Code tự động commit khi:
- Hoàn thành một tính năng
- Sửa xong một lỗi
- Hoàn thành refactoring

### Commit Message Format

```
feat: Thêm tính năng X
fix: Sửa lỗi Y
refactor: Tối ưu hóa Z
docs: Cập nhật tài liệu
test: Thêm tests
```

### Push Tự Động

```bash
# Bật auto-push trong settings
# Hoặc push thủ công
git push origin main
```

## 📊 Giám Sát Ứng Dụng

### Kiểm Tra Server Status

```bash
# Từ Claude Code terminal
curl http://localhost:3000/api/autowork/status

# Hoặc từ browser
# http://localhost:3000
```

### Xem WebSocket Connections

```bash
# Kiểm tra WS port
netstat -ano | findstr ":3002"

# Hoặc từ browser DevTools
# F12 → Network → WS
```

### Kiểm Tra Database

```bash
# Xem database schema
sqlite3 backend/db/jobs.db ".schema"

# Xem dữ liệu
sqlite3 backend/db/jobs.db "SELECT * FROM jobs LIMIT 5;"
```

## 🐛 Troubleshooting

### Lỗi: Port Already in Use

```bash
# Tìm process chiếm port
netstat -ano | findstr ":3000"

# Kill process (Windows)
taskkill /F /PID <PID>

# Kill process (macOS/Linux)
kill -9 <PID>
```

### Lỗi: Module Not Found

```bash
# Cài lại dependencies
rm -rf node_modules package-lock.json
npm install
```

### Lỗi: Database Locked

```bash
# Reset database
rm backend/db/jobs.db*
npm run db:init
```

### Lỗi: Git Conflicts

```bash
# Xem conflicts
git status

# Resolve conflicts
# Edit files manually hoặc
git checkout --theirs <file>
git add <file>
git commit -m "Resolve conflicts"
```

## 📝 Best Practices

### 1. Luôn Đọc CLAUDE.md Trước

```bash
# Claude Code sẽ tự động đọc CLAUDE.md
# Nó chứa toàn bộ thông tin về project
```

### 2. Viết Commit Messages Rõ Ràng

```bash
# ✅ Tốt
git commit -m "feat: Thêm tính năng gửi email khi bounty hoàn thành"

# ❌ Xấu
git commit -m "update"
```

### 3. Chạy Tests Trước Commit

```bash
npm test
npm run lint
```

### 4. Cập Nhật CLAUDE.md Khi Thay Đổi Architecture

```bash
# Sau khi thêm tính năng mới
# Cập nhật CLAUDE.md để Claude Code biết
```

### 5. Sử Dụng Feature Branches

```bash
# Tạo branch mới cho mỗi tính năng
git checkout -b feature/email-notifications

# Làm việc trên branch
# Commit thay đổi
# Push và tạo PR
```

## 🎓 Ví Dụ Thực Tế

### Ví Dụ 1: Thêm Tính Năng Mới

```
Bạn: "Thêm tính năng để lưu lịch sử tất cả các PR đã tạo"

Claude Code sẽ:
1. Phân tích database schema
2. Tạo migration để thêm bảng pr_history
3. Tạo model PRHistory
4. Tạo API endpoint GET /api/pr-history
5. Cập nhật dashboard UI
6. Viết tests
7. Commit: "feat: Add PR history tracking"
```

### Ví Dụ 2: Sửa Lỗi

```
Bạn: "Lỗi: Autowork pipeline không xử lý bounty có description rỗng"

Claude Code sẽ:
1. Tìm hàm analyzeAndDecide()
2. Thêm validation cho description
3. Thêm error handling
4. Viết test case
5. Commit: "fix: Handle empty description in autowork pipeline"
```

### Ví Dụ 3: Tối Ưu Hóa

```
Bạn: "Tối ưu hóa loadAutoworkStatus() - nó chạy quá chậm"

Claude Code sẽ:
1. Phân tích hàm
2. Thêm caching
3. Tối ưu queries
4. Chạy benchmarks
5. Commit: "perf: Optimize loadAutoworkStatus() with caching"
```

## 🔐 Bảo Mật

### Không Commit Secrets

```bash
# ✅ Tốt - Sử dụng .env
GITHUB_TOKEN=<token>

# ❌ Xấu - Hardcode trong code
const token = "ghp_xxxxx"
```

### Kiểm Tra Trước Commit

```bash
# Claude Code sẽ tự động kiểm tra
# Nhưng bạn cũng có thể kiểm tra thủ công
git diff --cached | grep -i "password\|token\|secret"
```

## 📚 Tài Liệu Thêm

- [CLAUDE.md](./CLAUDE.md) - Tài liệu dự án
- [Claude Code Docs](https://claude.ai/claude-code)
- [Express.js Docs](https://expressjs.com/)
- [SQLite Docs](https://www.sqlite.org/docs.html)

## 🎯 Tiếp Theo

1. **Cài đặt Claude Code**: `npm install -g @anthropic-ai/claude-code`
2. **Xác thực**: `claude-code auth`
3. **Mở project**: `claude-code .`
4. **Bắt đầu phát triển**: Mô tả tính năng bạn muốn

---

**Chúc bạn phát triển hiệu quả! 🚀**

Nếu có câu hỏi, hãy tham khảo CLAUDE.md hoặc hỏi Claude Code trực tiếp.
