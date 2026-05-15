# 💰 Freelance Job Manager - Kiếm Tiền Online

Công cụ quản lý freelance jobs từ Freelancer.com với workflow bán tự động. Hệ thống quét jobs, phân tích yêu cầu, và bạn xác nhận trước khi gửi proposal.

## ✨ Tính Năng

✅ **Quét Jobs Tự Động** - Tìm kiếm design jobs trên Freelancer.com (114 jobs hiện tại)  
✅ **Phân Tích Thông Minh** - AI phân tích requirements, độ khó, giá đề xuất  
✅ **Proposal Chuyên Nghiệp** - Tạo proposal draft tự động  
✅ **Workflow Bán Tự Động** - Bạn xác nhận mỗi bước trước khi thực hiện  
✅ **Tạo Design Tự Động** - SVG design generator cho 8+ loại design  
✅ **Tracking Earnings** - Theo dõi thu nhập & thống kê chi tiết  
✅ **Real-time Updates** - WebSocket live updates  
✅ **Dashboard 3-Panel** - Jobs list | Job details | Action panel  

## 🚀 Cài Đặt & Chạy

### 1. Chuẩn Bị API Keys

Bạn cần lấy **Freelancer OAuth Token**:

1. Đăng nhập vào [Freelancer.com](https://www.freelancer.com)
2. Vào Settings → My Apps → Create New App
3. Lấy **OAuth Token**
4. Paste vào file `.env`:

```bash
FREELANCER_OAUTH_TOKEN=your_token_here
```

### 2. Chạy Server

```bash
npm install
npm start
```

Server sẽ chạy tại:
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3000/api
- **WebSocket**: ws://localhost:3002

## 📖 Hướng Dẫn Sử Dụng

### Workflow (7 Bước)

1. **Scan Jobs** 🔍
   - Click nút "🔍 Scan" để tìm design jobs
   - Hệ thống quét Freelancer.com, phân tích mỗi job
   - Status: `ANALYZED`

2. **Review & Send Proposal** ✅
   - Xem chi tiết job, budget, độ khó, proposal draft
   - Click "✅ Send Proposal" để gửi proposal cho khách hàng
   - Status: `APPROVED`

3. **Accept Job** 🤝
   - Khi khách hàng chấp nhận, click "🤝 Accept (Send Message)"
   - Gửi tin nhắn xác nhận cho khách hàng
   - Status: `ACCEPTED`

4. **Generate Design** 🎨
   - Click "🎨 Start Work & Generate Design"
   - Hệ thống tự động tạo design SVG
   - Status: `IN_PROGRESS`

5. **Submit Deliverable** 📤
   - Click "📤 Submit Deliverable"
   - Gửi design cho khách hàng
   - Status: `SUBMITTED`

6. **Request Payment** 💰
   - Click "💰 Request Payment"
   - Yêu cầu milestone payment từ khách hàng
   - Status: `PAYMENT_REQUESTED`

7. **Confirm Payment** ✅
   - Khi nhận tiền, nhập số tiền vào input field
   - Click "✅ Confirm Paid"
   - Status: `COMPLETED` - Job hoàn thành!

## 📊 Dashboard

### Left Panel: Job Feed
- Danh sách tất cả jobs được quét
- Hiển thị: Title, Budget, Status badge
- Click để xem chi tiết job

### Center Panel: Job Details
- **Phân Tích**: Loại design, độ khó, điểm số (0-100)
- **Approach**: Các bước thực hiện
- **Proposal**: Draft proposal chuyên nghiệp cho khách hàng

### Right Panel: Action Buttons
- **ANALYZED**: "✅ Send Proposal" - Gửi proposal
- **APPROVED**: "🤝 Accept (Send Message)" - Xác nhận nhận job
- **ACCEPTED**: "🎨 Start Work & Generate Design" - Tạo design
- **IN_PROGRESS**: "📤 Submit Deliverable" - Nộp design
- **SUBMITTED**: "💰 Request Payment" - Yêu cầu thanh toán
- **PAYMENT_REQUESTED**: "✅ Confirm Paid" - Xác nhận đã nhận tiền
- **COMPLETED**: 🎉 Job hoàn thành - Hiển thị earnings

## 🔧 API Endpoints

### Jobs
```
GET  /api/jobs                    - Lấy danh sách jobs
GET  /api/jobs/:id               - Chi tiết job
POST /api/jobs/scan              - Quét jobs mới từ Freelancer
POST /api/jobs/:id/start-work    - Bắt đầu làm việc (tạo design)
POST /api/jobs/:id/confirm-payment - Xác nhận thanh toán
```

### Actions (Semi-Automatic)
```
POST /api/actions/send-proposal      - Gửi proposal cho khách hàng
POST /api/actions/send-message       - Gửi tin nhắn cho khách hàng
POST /api/actions/submit-deliverable - Nộp deliverable
POST /api/actions/request-payment    - Yêu cầu milestone payment
```

### Statistics
```
GET  /api/stats                  - Thống kê tổng (jobs, earnings, categories)
```

## 💡 Tips

- **Auto-scan**: Hệ thống tự động quét mỗi 60 giây (có thể thay đổi `SCAN_INTERVAL` trong `.env`)
- **Semi-automatic**: Mỗi bước đều cần bạn xác nhận trước khi thực hiện
- **Job scoring**: Mỗi job được chấm điểm 0-100 dựa trên budget, độ khó, số bids
- **Design generation**: Hệ thống tự động tạo SVG design dựa trên loại job
- **Real-time**: Dashboard cập nhật real-time khi có job/message mới qua WebSocket

## 📈 Current Statistics

- **Total Jobs**: 114
- **Analyzed**: 111
- **Submitted**: 3
- **Completed**: 0
- **Total Earnings**: $0

### Job Categories
- Web Design: 30 jobs
- General Design: 48 jobs
- Logo: 14 jobs
- Print: 7 jobs
- Social Media: 8 jobs
- Presentation: 3 jobs
- Other: 4 jobs

## 📁 Cấu Trúc Project

```
.
├── backend/
│   ├── server.js                 # Express server + WebSocket
│   ├── db/
│   │   └── database.js           # SQLite layer (better-sqlite3)
│   ├── routes/
│   │   ├── jobs.js               # Job CRUD endpoints
│   │   ├── actions.js            # Semi-auto action endpoints
│   │   ├── messages.js           # Message endpoints
│   │   └── stats.js              # Statistics endpoints
│   └── services/
│       ├── freelancerAPI.js      # Freelancer API client
│       ├── jobAnalyzer.js        # AI job analysis engine
│       ├── jobScanner.js         # Auto job scanner (60s interval)
│       ├── jobWorkflow.js        # Workflow state management
│       └── designGenerator.js    # SVG design generator
├── public/
│   └── index.html                # Dashboard UI (3-panel layout)
├── .env                          # Configuration
├── package.json                  # Dependencies
└── README.md                     # This file
```

## 🏗️ Architecture

### Frontend
- **Single Page App**: `public/index.html`
- **3-Panel Layout**: Jobs list | Job details | Action panel
- **Real-time Updates**: WebSocket connection to backend
- **Auto-detecting URLs**: Works on localhost and production

### Backend
- **Express Server**: REST API + WebSocket
- **SQLite Database**: Jobs, messages, statistics
- **Job Scanner**: Runs every 60 seconds, fetches from Freelancer API
- **Job Analyzer**: AI-powered analysis of job requirements
- **Design Generator**: Auto-generates SVG designs for 8+ categories
- **Workflow Manager**: Handles job state transitions

### Database Schema
```sql
jobs
  - id, platform, external_id, title, description
  - budget, currency, skills, status
  - analysis (JSON), solution (JSON)
  - created_at, analyzed_at, approved_at, submitted_at, completed_at, paid_at
  - earnings

messages
  - id, job_id, thread_id, sender, sender_type
  - content, draft_reply, reply_status
  - created_at, replied_at

stats
  - date, jobs_scanned, jobs_completed, earnings, messages_sent
```

## 🔐 Security

- API keys stored in `.env` (never in code)
- All API calls validated
- Rate limiting on Freelancer API
- Error logging & alerts

## 📝 Database

SQLite database tự động tạo 3 tables:
- **jobs**: Lưu job details, status, earnings
- **messages**: Lưu tin nhắn từ khách hàng
- **stats**: Thống kê theo ngày

## 🐛 Troubleshooting

**Server không chạy?**
- Kiểm tra port 3000 & 3002 có bị chiếm không
- Chạy: `taskkill /F /IM node.exe` để kill tất cả Node processes
- Xóa `backend/db/jobs.db*` và chạy lại

**API không kết nối?**
- Kiểm tra `FREELANCER_OAUTH_TOKEN` trong `.env`
- Xem logs server để debug
- Kiểm tra Freelancer API status

**Dashboard không load?**
- Kiểm tra WebSocket kết nối (ws://localhost:3002)
- Mở DevTools (F12) để xem console errors
- Refresh browser (Ctrl+R)

**Action buttons không hiển thị?**
- Kiểm tra job status trong database
- Xem browser console cho JavaScript errors
- Đảm bảo API endpoints đang chạy

## 🚀 Deployment (Railway)

### Setup
1. Push code lên GitHub: `git push origin main`
2. Kết nối GitHub repo với Railway
3. Set environment variables trong Railway dashboard:
   ```
   FREELANCER_OAUTH_TOKEN=your_token
   PAYPAL_EMAIL=your_email@example.com
   PORT=3000
   WS_PORT=3002
   SCAN_INTERVAL=60000
   ```
4. Railway tự động deploy khi push code

### Access
- Dashboard: `https://your-railway-url.railway.app`
- API: `https://your-railway-url.railway.app/api`
- WebSocket: `wss://your-railway-url.railway.app` (auto-upgraded from ws)

---

**Made with ❤️ for freelancers**

Kiếm tiền online dễ dàng hơn! 💰
