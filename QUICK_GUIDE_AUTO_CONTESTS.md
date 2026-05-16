# 🏆 Hướng Dẫn Nhanh - Auto-Scan Contests

## 📱 Dashboard Mới

### Contest Panel (Phía Dưới)
```
🏆 Cuộc Thi Tự Động [5]
┌─────────────────────────────────────────────────────┐
│ [Logo Design]    [Banner Design]    [Web Design]    │
│ 💰 $100          💰 $150            💰 $200         │
│ 🎯 75/100        🎯 82/100          🎯 88/100       │
│ [🏆 Nộp Bài]     [🏆 Nộp Bài]       [✅ Đã nộp]    │
│                                                      │
│ [📤 Nộp Tất Cả] [🔄 Làm Mới]  Đang quét...        │
└─────────────────────────────────────────────────────┘
```

## 🎯 Cách Sử Dụng

### Bước 1: Mở Dashboard
```
1. Truy cập: https://your-railway-url
2. Dashboard tự động load
3. Hệ thống tự động quét cuộc thi
```

### Bước 2: Xem Cuộc Thi Mới
```
1. Cuộc Thi Tự Động panel ở phía dưới
2. Xem danh sách cuộc thi
3. Mỗi card hiển thị:
   - Tên cuộc thi
   - Prize ($)
   - Job score (0-100)
   - Nút "🏆 Nộp Bài Thi"
```

### Bước 3: Nộp Bài Thi

#### Cách 1: Nộp Từng Cuộc Thi
```
1. Click "🏆 Nộp Bài Thi" trên card
2. Xác nhận dialog: "Nộp bài thi: [Title] ($[Prize])?"
3. Hệ thống tự động submit entry
4. Thông báo: "✅ Nộp bài thành công"
5. Card chuyển sang "✅ Đã nộp"
```

#### Cách 2: Nộp Tất Cả Cùng Lúc
```
1. Click "📤 Nộp Tất Cả"
2. Xác nhận: "Nộp bài cho 5 cuộc thi?"
3. Hệ thống submit tất cả
4. Thông báo: "✅ Nộp bài thành công: 5/5"
5. Tất cả card chuyển sang "✅ Đã nộp"
```

### Bước 4: Chờ Kết Quả
```
1. Hệ thống giám sát tự động
2. Thông báo khi được trao giải
3. Bạn bắt đầu làm việc
4. Nộp deliverable
5. Yêu cầu thanh toán
6. Hoàn thành
```

## 🔄 Auto-Scan Hoạt Động Như Thế Nào

### Mỗi 2 Phút (MONITOR_INTERVAL)
```
1. Hệ thống quét Freelancer.com
2. Tìm cuộc thi (keyword: "contest", "competition")
3. Lọc theo 20 design skills của bạn
4. Lưu cuộc thi mới vào database
5. Broadcast WebSocket notification
6. Auto-refresh contest panel
```

### Cuộc Thi Được Lọc
```
✅ Phù hợp:
- Logo Design
- Banner Design
- Web Design
- Graphic Design
- UI Design
- Illustration
- Social Media Design
- v.v.

❌ Loại bỏ:
- Bid trực tiếp (fixed price)
- Không phù hợp skills
- Đã nộp rồi
```

## 💡 Mẹo Sử Dụng

### Mẹo 1: Nộp Bài Nhanh
```
Sáng: Mở dashboard → Xem cuộc thi
Chiều: Click "📤 Nộp Tất Cả" → Xong
Tối: Chờ thông báo từ hệ thống
```

### Mẹo 2: Giám Sát Tự Động
```
- Hệ thống quét mỗi 2 phút
- Thông báo real-time
- Bạn chỉ cần xem dashboard
- Không cần tìm job thủ công
```

### Mẹo 3: Tối Ưu Hóa
```
- Nộp bài cho tất cả cuộc thi phù hợp
- Tỷ lệ thắng cao hơn
- Thu nhập cao hơn
- Tiết kiệm thời gian
```

## 📊 Ví Dụ Thực Tế

### Tình Huống 1: Quét Cuộc Thi Mới
```
Thời gian: 11:00 AM
Hệ thống: Quét Freelancer.com
Kết quả: Tìm 5 cuộc thi mới
Dashboard: Hiển thị 5 card trên Contest Panel
Thông báo: "🏆 Cuộc thi mới: Logo Design Contest ($100)"
```

### Tình Huống 2: Nộp Bài Thi
```
Thời gian: 11:05 AM
Bạn: Click "🏆 Nộp Bài Thi" trên card
Dialog: "Nộp bài thi: Logo Design Contest ($100)?"
Bạn: Click "OK"
Hệ thống: Submit entry tự động
Thông báo: "✅ Nộp bài thành công: Logo Design Contest"
Card: Chuyển sang "✅ Đã nộp"
```

### Tình Huống 3: Nộp Tất Cả
```
Thời gian: 11:10 AM
Dashboard: Hiển thị 5 cuộc thi sẵn sàng
Bạn: Click "📤 Nộp Tất Cả"
Dialog: "Nộp bài cho 5 cuộc thi?"
Bạn: Click "OK"
Hệ thống: Submit tất cả 5 entry
Thông báo: "✅ Nộp bài thành công: 5/5"
Dashboard: Tất cả card chuyển sang "✅ Đã nộp"
```

## 🔔 Thông Báo

### Cuộc Thi Mới
```
🏆 Cuộc thi mới: Logo Design Contest ($100)
```

### Nộp Bài Thành Công
```
✅ Nộp bài thành công: Logo Design Contest
```

### Batch Submission
```
✅ Nộp bài thành công: 5/5
```

### Được Trao Giải
```
🎉 Job awarded: Logo Design Contest ($100)
```

## ✅ Checklist Hàng Ngày

- [ ] Mở dashboard
- [ ] Xem Contest Panel
- [ ] Nộp bài cho cuộc thi mới
- [ ] Chờ thông báo từ hệ thống
- [ ] Hành động khi được trao giải

## 🚀 Bắt Đầu

1. **Mở Dashboard**: https://your-railway-url
2. **Xem Contest Panel**: Phía dưới dashboard
3. **Nộp Bài**: Click "🏆 Nộp Bài Thi" hoặc "📤 Nộp Tất Cả"
4. **Chờ Kết Quả**: Hệ thống thông báo tự động

---

**Hệ thống sẵn sàng! Bắt đầu kiếm tiền ngay!** 💰
