# 📖 Hướng Dẫn Sử Dụng Tính Năng Theo Dõi Bid

## 🎯 Mục Đích

Tính năng này giúp bạn:
- ✅ Theo dõi job nào đã apply
- ✅ Tránh apply lại cùng job (lỗi 409)
- ✅ Lọc job theo trạng thái apply
- ✅ Xem bid amount và ngày apply

## 📱 Giao Diện Dashboard

### Phần Trên Cùng (Job List Header)
```
📋 Jobs [0]
┌─────────────────────────────────────┐
│ [Dropdown: Tất cả ▼] [🔍 Scan]     │
└─────────────────────────────────────┘
```

### Dropdown Bộ Lọc
- **Tất cả** - Hiển thị tất cả jobs
- **Chưa apply** - Chỉ job chưa apply
- **Đã apply** - Chỉ job đã apply

## 🔍 Cách Sử Dụng

### Bước 1: Quét Job
1. Click nút "🔍 Scan"
2. Hệ thống quét job từ Freelancer
3. Danh sách job được cập nhật

### Bước 2: Lọc Job
1. Chọn dropdown bộ lọc
2. Chọn "Chưa apply" để xem job mới
3. Danh sách tự động cập nhật

### Bước 3: Xem Job Đã Apply
1. Chọn "Đã apply" từ dropdown
2. Xem danh sách job đã apply
3. Mỗi job hiển thị:
   - Badge xanh "✅ Đã apply"
   - Bid amount: `💵 Bid: $50`
   - Ngày apply: `• 16/05/2026`

### Bước 4: Xem Chi Tiết Job
1. Click vào job để xem chi tiết
2. Nếu đã apply, hiển thị:
   ```
   ✅ Đã Apply
   Bid: $50
   Ngày: 16/05/2026
   ```
3. Phần Actions hiển thị:
   ```
   ⏳ Chờ Khách Hàng
   Hệ thống sẽ giám sát để phát hiện...
   ```

## 📊 Ví Dụ Thực Tế

### Tình Huống 1: Quét Job Mới
```
1. Click "🔍 Scan"
2. Hệ thống tìm 5 job mới
3. Danh sách hiển thị:
   - Job A (chưa apply)
   - Job B (chưa apply)
   - Job C (đã apply - badge xanh)
   - Job D (chưa apply)
   - Job E (đã apply - badge xanh)
```

### Tình Huống 2: Lọc Job Chưa Apply
```
1. Chọn "Chưa apply" từ dropdown
2. Danh sách chỉ hiển thị:
   - Job A
   - Job B
   - Job D
3. Bạn có thể apply những job này
```

### Tình Huống 3: Xem Job Đã Apply
```
1. Chọn "Đã apply" từ dropdown
2. Danh sách chỉ hiển thị:
   - Job C (💵 Bid: $50 • 16/05/2026)
   - Job E (💵 Bid: $75 • 16/05/2026)
3. Bạn có thể xem chi tiết từng job
```

### Tình Huống 4: Cố Apply Lại
```
1. Chọn Job C (đã apply)
2. Click "✅ Gửi Đề Xuất"
3. Hệ thống hiển thị:
   ⚠️ Bạn đã apply job này rồi
4. Job vẫn hiển thị trạng thái "✅ Đã apply"
```

## 🎨 Hiển Thị Trạng Thái

### Job Chưa Apply
```
┌─────────────────────────────────┐
│ Logo Design                     │
│ 💰 $100 | ANALYZED              │
└─────────────────────────────────┘
```

### Job Đã Apply
```
┌─────────────────────────────────┐
│ Web Design                      │
│ 💰 $150 | APPROVED | ✅ Đã apply│
│ 💵 Bid: $150 • 16/05/2026       │
└─────────────────────────────────┘
```

## 📋 Thông Tin Hiển Thị

### Khi Chưa Apply
- Tiêu đề job
- Budget
- Trạng thái (ANALYZED, SCANNED, v.v.)
- Không có badge "✅ Đã apply"

### Khi Đã Apply
- Tiêu đề job
- Budget
- Trạng thái (APPROVED, v.v.)
- Badge xanh "✅ Đã apply"
- Bid amount: `💵 Bid: $[amount]`
- Ngày apply: `• DD/MM/YYYY`

## 🔧 Tính Năng Kỹ Thuật

### Database
```sql
-- Cột mới trong bảng jobs
bid_placed BOOLEAN DEFAULT 0        -- Đã apply hay chưa
bid_placed_at DATETIME              -- Thời gian apply
bid_amount REAL DEFAULT 0           -- Số tiền bid
```

### API Kiểm Tra
```
POST /api/actions/send-proposal

Kiểm tra:
- Nếu bid_placed = 1 → Lỗi 409
- Nếu chưa apply → Tiếp tục

Cập nhật:
- bid_placed = 1
- bid_placed_at = CURRENT_TIMESTAMP
- bid_amount = [số tiền]
```

## ⚠️ Xử Lý Lỗi

### Lỗi 409: Already Bid
```
❌ API Error 409: You have already bid on that project

Giải pháp:
1. Hệ thống tự động kiểm tra
2. Hiển thị thông báo: "⚠️ Bạn đã apply job này rồi"
3. Job được đánh dấu "✅ Đã apply"
4. Không cần apply lại
```

### Lỗi 400: You have used all of your bids
```
❌ API Error 400: You have used all of your bids

Giải pháp:
1. Chờ đến ngày mai
2. Hoặc nâng cấp tài khoản Freelancer
3. Hệ thống sẽ tiếp tục hoạt động bình thường
```

## 💡 Mẹo Sử Dụng

### Mẹo 1: Quản Lý Bid Hàng Ngày
```
Sáng:
1. Click "🔍 Scan" để tìm job mới
2. Chọn "Chưa apply" để xem job mới
3. Apply những job tốt nhất

Chiều:
1. Chọn "Đã apply" để xem job đã apply
2. Chờ khách hàng liên hệ
3. Hệ thống sẽ thông báo khi có tin nhắn
```

### Mẹo 2: Tránh Lỗi 409
```
Trước khi apply:
1. Chọn "Đã apply" từ dropdown
2. Kiểm tra job này có trong danh sách không
3. Nếu có → Không apply lại
4. Nếu không → Có thể apply
```

### Mẹo 3: Theo Dõi Bid Amount
```
Xem job đã apply:
1. Chọn "Đã apply"
2. Xem bid amount của mỗi job
3. Tính tổng bid đã gửi
4. Quản lý ngân sách tốt hơn
```

## 📊 Thống Kê

### Xem Thống Kê Apply
```
Chọn "Đã apply" để xem:
- Tổng job đã apply
- Bid amount của mỗi job
- Ngày apply
- Trạng thái hiện tại
```

## 🔄 Quy Trình Hoàn Chỉnh

```
1. Quét Job
   ↓
2. Lọc "Chưa apply"
   ↓
3. Xem Job Mới
   ↓
4. Apply Job Tốt
   ↓
5. Job Chuyển Sang "Đã apply"
   ↓
6. Chờ Khách Hàng Liên Hệ
   ↓
7. Hệ Thống Thông Báo
   ↓
8. Bạn Xem Chi Tiết & Hành Động
```

## ✅ Checklist Hàng Ngày

- [ ] Quét job mới (🔍 Scan)
- [ ] Lọc "Chưa apply" để xem job mới
- [ ] Apply những job tốt nhất
- [ ] Kiểm tra "Đã apply" để xem tổng
- [ ] Chờ khách hàng liên hệ
- [ ] Xem thông báo từ hệ thống

---

**Tính năng này giúp bạn quản lý bid tốt hơn và tránh lỗi 409!** ✅
