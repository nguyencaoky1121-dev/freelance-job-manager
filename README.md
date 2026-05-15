# 💰 Freelance Job Manager - Kiếm Tiền Online

Công cụ tự động quản lý freelance jobs từ Freelancer.com với dashboard thân thiện.

## ✨ Tính Năng

✅ **Quét Jobs Tự Động** - Tìm kiếm design jobs trên Freelancer.com  
✅ **Phân Tích Thông Minh** - Phân tích requirements, độ khó, giá đề xuất  
✅ **Proposal Tự Động** - Tạo proposal draft chuyên nghiệp  
✅ **Quản Lý Messages** - Xem tin nhắn từ khách hàng & soạn reply tự động  
✅ **Tracking Earnings** - Theo dõi thu nhập & thống kê  
✅ **Real-time Updates** - WebSocket live updates  

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
npm start
```

Server sẽ chạy tại:
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3000/api
- **WebSocket**: ws://localhost:3001

## 📖 Hướng Dẫn Sử Dụng

### Workflow

1. **Scan Jobs** 🔍
   - Click nút "🔍 Scan" để tìm design jobs
   - Hệ thống sẽ quét Freelancer.com

2. **Review Job** 👀
   - Xem chi tiết job, budget, độ khó
   - Đọc proposal draft tự động

3. **Approve** ✅
   - Click "✅ Approve & Proceed" nếu muốn nhận job
   - Hệ thống sẽ chuẩn bị deliverable

4. **Handle Messages** 💬
   - Xem tin nhắn từ khách hàng
   - Review draft reply tự động
   - Click "Send Reply" để gửi

5. **Submit & Get Paid** 💰
   - Click "📤 Submit Deliverable"
   - Khi khách hàng thanh toán, click "💰 Mark as Paid"
   - Tiền sẽ được ghi nhận

## 📊 Dashboard

### Left Panel: Job Feed
- Danh sách tất cả jobs được quét
- Hiển thị: Title, Budget, Status
- Click để xem chi tiết

### Right Panel: Job Details
- **Phân Tích**: Loại, độ khó, điểm số
- **Proposal**: Draft proposal cho khách hàng
- **Messages**: Tin nhắn từ khách hàng + draft reply
- **Actions**: Approve, Submit, Mark as Paid

## 🔧 API Endpoints

```
GET  /api/jobs                    - Lấy danh sách jobs
GET  /api/jobs/:id               - Chi tiết job
POST /api/jobs/scan              - Quét jobs mới
POST /api/jobs/:id/approve       - Approve job
POST /api/jobs/:id/submit        - Submit deliverable
POST /api/jobs/:id/complete      - Mark as paid

GET  /api/messages/:jobId        - Lấy messages
POST /api/messages/:id/reply     - Gửi reply

GET  /api/stats                  - Thống kê tổng
GET  /api/stats/daily            - Thống kê theo ngày
```

## 💡 Tips

- **Auto-scan**: Hệ thống tự động quét mỗi 60 giây (có thể thay đổi trong `.env`)
- **Draft replies**: AI tự động soạn reply dựa trên nội dung tin nhắn
- **Job scoring**: Mỗi job được chấm điểm 0-100 dựa trên budget, độ khó, số bids
- **Real-time**: Dashboard cập nhật real-time khi có job/message mới

## 📁 Cấu Trúc Project

```
.
├── backend/
│   ├── server.js                 # Main server
│   ├── db/
│   │   └── database.js           # SQLite setup
│   ├── routes/
│   │   ├── jobs.js               # Job endpoints
│   │   ├── messages.js           # Message endpoints
│   │   ├── freelancer.js         # Freelancer API
│   │   └── stats.js              # Statistics
│   └── services/
│       ├── freelancerAPI.js      # Freelancer API client
│       ├── jobAnalyzer.js        # Job analysis & auto-reply
│       └── jobScanner.js         # Job scanner
├── public/
│   └── index.html                # Dashboard UI
├── .env                          # Configuration
└── package.json
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
- Kiểm tra port 3000 & 3001 có bị chiếm không
- Xóa `backend/db/jobs.db` và chạy lại

**API không kết nối?**
- Kiểm tra `FREELANCER_OAUTH_TOKEN` trong `.env`
- Xem logs server để debug

**Dashboard không load?**
- Kiểm tra WebSocket kết nối (ws://localhost:3001)
- Mở DevTools (F12) để xem console errors

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra `.env` configuration
2. Xem server logs
3. Kiểm tra browser console (F12)

---

**Made with ❤️ for freelancers**

Kiếm tiền online dễ dàng hơn! 💰
