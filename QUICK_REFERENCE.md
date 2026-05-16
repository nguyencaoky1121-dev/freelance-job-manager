# 📖 Tài Liệu Tham Khảo Nhanh - Hệ Thống Quản Lý Freelance

## 🎯 Tính Năng Chính

### 1️⃣ Quét Job Tự Động
- **Cách dùng:** Click "🔍 Scan"
- **Kết quả:** Tìm job từ Freelancer.com
- **Lọc:** Chỉ job matching 20 skills của bạn
- **Tần suất:** Mỗi 60 giây (tự động)

### 2️⃣ Phân Tích Job
- **Tự động:** Phân tích yêu cầu, độ phức tạp
- **Đề xuất:** Bid amount, thời gian, cách tiếp cận
- **Điểm số:** 0-100 (khả năng thắng)

### 3️⃣ Gửi Proposal
- **Cách dùng:** Click "✅ Gửi Đề Xuất"
- **Tự động:** Gửi bid với số tiền đề xuất
- **Trạng thái:** Job chuyển sang "APPROVED"

### 4️⃣ Phát Hiện Liên Hệ Khách Hàng ⭐ MỚI
- **Tự động:** Kiểm tra mỗi 2 phút
- **Thông báo:** Toast notification + alert badge
- **Tạo nháp:** Auto-generate draft reply

### 5️⃣ Phát Hiện Trao Giải Job ⭐ MỚI
- **Tự động:** Kiểm tra bid được chấp nhận
- **Cập nhật:** Job status → "ACCEPTED"
- **Thông báo:** "🎉 Job awarded: [Title] ($[Budget])"

### 6️⃣ Theo Dõi Bid ⭐ MỚI
- **Lọc job:** Tất cả / Chưa apply / Đã apply
- **Hiển thị:** Badge "✅ Đã apply", bid amount, ngày
- **Ngăn chặn:** Không apply lại cùng job

### 7️⃣ Quy Trình Làm Việc
- **Bắt đầu:** Click "🎨 Bắt Đầu & Tạo Design"
- **Nộp:** Click "📤 Nộp Deliverable"
- **Thanh toán:** Click "💰 Yêu Cầu Thanh Toán"
- **Hoàn thành:** Xác nhận thanh toán

---

## 📱 Dashboard

### Header
```
📋 Jobs [3]          ← Badge: 3 job mới
💼 Job Details 🟢    ← Green dot: Monitoring active
🎯 Actions [1]       ← Badge: 1 tin nhắn mới
```

### Job List Filter
```
[Dropdown: Tất cả ▼] [🔍 Scan]
```

**Tùy chọn:**
- Tất cả - Xem tất cả jobs
- Chưa apply - Chỉ job chưa apply
- Đã apply - Chỉ job đã apply

### Job Item
```
Chưa apply:
┌─────────────────────────────┐
│ Logo Design                 │
│ 💰 $100 | ANALYZED          │
└─────────────────────────────┘

Đã apply:
┌─────────────────────────────┐
│ Web Design                  │
│ 💰 $150 | APPROVED | ✅ Đã │
│ 💵 Bid: $150 • 16/05/2026   │
└─────────────────────────────┘
```

---

## 🔄 Quy Trình Hoàn Chỉnh

```
1. QUÉT JOB
   ↓
2. LỌC "CHƯA APPLY"
   ↓
3. XEM CHI TIẾT JOB
   ↓
4. APPLY JOB
   ↓
5. JOB CHUYỂN SANG "ĐÃ APPLY"
   ↓
6. CHỜ KHÁCH HÀNG LIÊN HỆ
   ↓
7. HỆ THỐNG THÔNG BÁO
   ↓
8. BẠN XEM & HÀNH ĐỘNG
   ↓
9. KHÁCH HÀNG TRAO GIẢI
   ↓
10. HỆ THỐNG CẬP NHẬT STATUS
    ↓
11. BẠN BẮT ĐẦU LÀM VIỆC
    ↓
12. NỘP DELIVERABLE
    ↓
13. YÊU CẦU THANH TOÁN
    ↓
14. HOÀN THÀNH
```

---

## 🎯 Trạng Thái Job

| Trạng Thái | Ý Nghĩa | Hành Động |
|-----------|---------|----------|
| SCANNED | Job vừa được quét | Chờ phân tích |
| ANALYZED | Phân tích xong | Click "✅ Gửi Đề Xuất" |
| APPROVED | Đã gửi proposal | Chờ khách hàng |
| ACCEPTED | Khách hàng trao giải | Click "🎨 Bắt Đầu" |
| IN_PROGRESS | Đang làm việc | Click "📤 Nộp" |
| SUBMITTED | Đã nộp deliverable | Click "💰 Yêu Cầu" |
| PAYMENT_REQUESTED | Yêu cầu thanh toán | Click "✅ Xác Nhận" |
| COMPLETED | Hoàn thành | Xem thu nhập |

---

## 🔔 Thông Báo

### Toast Notification
```
✅ Proposal sent!
💬 Message from [Client]: [preview]
🎉 Job awarded: [Title] ($[Budget])
📤 Deliverable submitted
💰 Payment requested: $[Amount]
```

### Alert Badges
```
📋 Jobs [3]  ← 3 job mới
🎯 Actions [1]  ← 1 tin nhắn mới
```

### Monitoring Status
```
🟢 Monitoring active  ← Green dot
🔴 Monitoring offline  ← Red dot
```

---

## 🛠️ API Endpoints

### Monitor
```
GET  /api/monitor/status
POST /api/monitor/check-messages
POST /api/monitor/check-awards
POST /api/monitor/run-cycle
POST /api/monitor/start
POST /api/monitor/stop
```

### Jobs
```
GET  /api/jobs
POST /api/jobs/scan
POST /api/jobs/:id/start-work
POST /api/jobs/:id/confirm-payment
```

### Actions
```
POST /api/actions/send-proposal
POST /api/actions/send-message
POST /api/actions/submit-deliverable
POST /api/actions/request-payment
```

---

## ⚙️ Cấu Hình

### .env
```
MONITOR_INTERVAL=120000        # Kiểm tra mỗi 2 phút
FREELANCER_USER_ID=92669282    # User ID của bạn
FREELANCER_OAUTH_TOKEN=...     # API token
WS_PORT=3002                   # WebSocket port
```

### Điều Chỉnh
- **Kiểm tra thường xuyên hơn:** Giảm MONITOR_INTERVAL
- **Kiểm tra ít hơn:** Tăng MONITOR_INTERVAL
- **Ví dụ:**
  - 60000 = 1 phút
  - 120000 = 2 phút (mặc định)
  - 300000 = 5 phút

---

## 🐛 Xử Lý Lỗi

### Lỗi 409: Already Bid
```
❌ API Error 409: You have already bid on that project

Giải pháp:
1. Hệ thống tự động kiểm tra
2. Hiển thị: "⚠️ Bạn đã apply job này rồi"
3. Job được đánh dấu "✅ Đã apply"
```

### Lỗi 400: Used All Bids
```
❌ API Error 400: You have used all of your bids

Giải pháp:
1. Chờ đến ngày mai
2. Hoặc nâng cấp tài khoản Freelancer
```

### WebSocket Offline
```
🔴 Monitoring offline

Giải pháp:
1. Kiểm tra server đang chạy
2. Refresh dashboard
3. Kiểm tra WS_PORT (3002)
```

---

## 📊 Thống Kê

### Xem Thống Kê
- Chọn "Đã apply" để xem job đã apply
- Xem bid amount của mỗi job
- Tính tổng bid đã gửi

### Theo Dõi
- Số job quét được
- Số job đã apply
- Số job được trao giải
- Thu nhập từ job hoàn thành

---

## 💡 Mẹo

### Mẹo 1: Quản Lý Bid
```
Sáng: Quét job → Apply những job tốt
Chiều: Xem "Đã apply" → Chờ khách hàng
Tối: Kiểm tra thông báo → Hành động
```

### Mẹo 2: Tránh Lỗi 409
```
Trước apply:
1. Chọn "Đã apply"
2. Kiểm tra job này có không
3. Nếu không → Apply
4. Nếu có → Bỏ qua
```

### Mẹo 3: Tối Ưu Bid
```
1. Xem job nào bạn thắng nhiều
2. Điều chỉnh bid strategy
3. Tăng tỷ lệ thắng
4. Tiết kiệm lượt bid
```

---

## 📚 Tài Liệu Chi Tiết

- **QUICK_START.md** - Hướng dẫn nhanh
- **MONITORING_SYSTEM.md** - Hệ thống giám sát
- **BID_TRACKING_FEATURE.md** - Tính năng bid
- **GUIDE_BID_TRACKING.md** - Hướng dẫn sử dụng
- **FINAL_SUMMARY.md** - Tóm tắt toàn bộ

---

## 🚀 Bắt Đầu

1. **Mở Dashboard:** https://your-railway-url
2. **Kiểm tra Monitoring:** Xem green dot
3. **Quét Job:** Click "🔍 Scan"
4. **Lọc Job:** Chọn "Chưa apply"
5. **Apply Job:** Click job → "✅ Gửi Đề Xuất"
6. **Chờ Thông Báo:** Hệ thống sẽ thông báo

---

**Hệ thống sẵn sàng! Bắt đầu kiếm tiền ngay! 💰**
