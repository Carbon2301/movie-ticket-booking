# Sử dụng Node.js LTS
FROM node:20-alpine

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy package files
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy toàn bộ source code
COPY . .

# Expose port Vite mặc định
EXPOSE 5173

# Chạy ở chế độ development
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
