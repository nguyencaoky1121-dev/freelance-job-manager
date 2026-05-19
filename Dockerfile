# Sử dụng node image bản slim làm base
FROM node:18-slim

# Cài đặt git và các thư viện cần thiết để build native modules (như better-sqlite3)
# Chúng ta cần python3, g++, make để biên dịch sqlite3 trên Linux
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Tạo thư mục làm việc trong container
WORKDIR /app

# Sao chép package.json và package-lock.json (nếu có)
COPY package*.json ./

# Cài đặt dependencies
# Sử dụng --build-from-source cho better-sqlite3 nếu cần, nhưng npm install thường tự xử lý
RUN npm install

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Railway sẽ tự động cung cấp biến PORT thông qua .env của nó
ENV PORT=3000

# Lệnh khởi chạy ứng dụng
CMD ["npm", "start"]
