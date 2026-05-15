# 🚀 SETUP GUIDE - Hướng Dẫn Cài Đặt

## Bước 1: Lấy Freelancer OAuth Token

### Cách lấy token:

1. **Đăng nhập Freelancer.com**
   - Vào https://www.freelancer.com
   - Đăng nhập tài khoản của bạn

2. **Tạo App**
   - Vào Settings → My Apps
   - Click "Create New App"
   - Điền thông tin:
     - **App Name**: "Freelance Job Manager"
     - **Description**: "Auto job manager"
   - Click "Create"

3. **Lấy OAuth Token**
   - Vào app vừa tạo
   - Copy **OAuth Token** (dài khoảng 40 ký tự)
   - Lưu lại

### Paste vào .env:

```bash
FREELANCER_OAUTH_TOKEN=your_token_here_paste_here
```

## Bước 2: Cài Đặt & Chạy

### Windows:
```bash
# Double-click file start.bat
# Hoặc chạy command:
npm start
```

### Mac/Linux:
```bash
chmod +x start.sh
./start.sh
# Hoặc:
npm start
```

## Bước 3: Mở Dashboard

Sau khi server chạy, mở browser:
```
http://localhost:3000
```

## Bước 4: Bắt Đầu Quét Jobs

1. Click nút **"🔍 Scan"** trên dashboard
2. Chờ hệ thống quét jobs từ Freelancer.com
3. Jobs sẽ hiển thị trên danh sách bên trái

## Workflow Chi Tiết

### 1️⃣ Scan Jobs
```
Click "🔍 Scan" → Hệ thống quét Freelancer.com → Jobs hiển thị
```

### 2️⃣ Review Job
```
Click job → Xem chi tiết, budget, độ khó, proposal draft
```

### 3️⃣ Approve Job
```
Click "✅ Approve & Proceed" → Job được chấp nhận
```

### 4️⃣ Handle Messages
```
Khách hàng gửi tin nhắn → Xem draft reply → Click "Send Reply"
```

### 5️⃣ Submit Deliverable
```
Click "📤 Submit Deliverable" → Gửi file cho khách hàng
```

### 6️⃣ Get Paid
```
Khách hàng thanh toán → Click "💰 Mark as Paid" → Tiền được ghi nhận
```

## 📊 Dashboard Features

### Left Panel: Job Feed
- **Danh sách jobs** được quét
- **Status**: ANALYZED, APPROVED, SUBMITTED, COMPLETED
- **Budget**: Giá tiền của job
- Click để xem chi tiết

### Right Panel: Job Details
- **📊 Phân Tích**: Loại design, độ khó, điểm số
- **💡 Cách Tiếp Cận**: Các bước để hoàn thành job
- **📝 Proposal Draft**: Proposal tự động cho khách hàng
- **💬 Messages**: Tin nhắn từ khách hàng + draft reply
- **🎯 Actions**: Approve, Submit, Mark as Paid

## 🔧 Configuration

File `.env` chứa các cấu hình:

```bash
# Freelancer API
FREELANCER_OAUTH_TOKEN=your_token_here

# PayPal (nhận tiền)
PAYPAL_EMAIL=datmasuto1993@gmail.com

# Server ports
PORT=3000
WS_PORT=3001

# Auto-scan interval (ms)
SCAN_INTERVAL=60000  # 60 giây
```

### Thay đổi scan interval:
```bash
# Quét mỗi 30 giây:
SCAN_INTERVAL=30000

# Quét mỗi 2 phút:
SCAN_INTERVAL=120000
```

## 💡 Tips & Tricks

### 1. Auto-Scan
- Hệ thống tự động quét jobs mỗi 60 giây
- Bạn sẽ thấy notification khi có job mới

### 2. Smart Proposals
- AI tự động tạo proposal chuyên nghiệp
- Bạn có thể edit trước khi gửi

### 3. Auto-Replies
- Khi khách hàng gửi tin nhắn, AI soạn reply tự động
- Bạn review và click "Send" để gửi

### 4. Job Scoring
- Mỗi job được chấm 0-100 dựa trên:
  - Budget (cao = điểm cao)
  - Độ khó (dễ = nhanh hoàn thành)
  - Số bids (ít bids = cơ hội cao)

### 5. Real-time Updates
- Dashboard cập nhật live khi có job/message mới
- Không cần refresh page

## 🐛 Troubleshooting

### Server không chạy?
```bash
# Kiểm tra port 3000 có bị chiếm không
netstat -ano | findstr :3000

# Nếu bị chiếm, thay đổi PORT trong .env
PORT=3001
```

### API không kết nối?
```bash
# Kiểm tra FREELANCER_OAUTH_TOKEN
# Mở .env và xác nhận token đúng

# Test API:
curl http://localhost:3000/api/stats
```

### Dashboard không load?
```bash
# Mở DevTools (F12)
# Kiểm tra console có error không
# Kiểm tra WebSocket kết nối: ws://localhost:3001
```

### Database bị lỗi?
```bash
# Xóa database cũ
rm backend/db/jobs.db

# Chạy lại server
npm start
```

## 📈 Monitoring

### Xem Statistics:
```bash
# API endpoint:
http://localhost:3000/api/stats

# Hiển thị:
- Total jobs scanned
- Jobs completed
- Total earnings
- Average earnings per job
```

### Xem Daily Earnings:
```bash
# API endpoint:
http://localhost:3000/api/stats/daily

# Hiển thị earnings theo ngày
```

## 🔐 Security Notes

- ✅ API keys stored in `.env` (never in code)
- ✅ All API calls validated
- ✅ Rate limiting on Freelancer API
- ✅ Error logging & alerts
- ⚠️ Không share `.env` file với ai

## 📞 Support

Nếu gặp vấn đề:

1. **Kiểm tra logs**
   - Xem console output khi chạy server
   - Mở DevTools (F12) trên browser

2. **Kiểm tra configuration**
   - Xác nhận `.env` có đúng token không
   - Kiểm tra ports 3000 & 3001 có bị chiếm không

3. **Reset database**
   - Xóa `backend/db/jobs.db`
   - Chạy lại server

## 🎯 Next Steps

1. ✅ Lấy Freelancer OAuth Token
2. ✅ Paste vào `.env`
3. ✅ Chạy `npm start`
4. ✅ Mở http://localhost:3000
5. ✅ Click "🔍 Scan" để bắt đầu
6. ✅ Kiếm tiền! 💰

---

**Happy earning! 🚀💰**
