# Movie Booking System - Backend

Backend API cho hệ thống đặt vé xem phim được xây dựng với NestJS, Prisma ORM và MySQL.

## Mô tả

Đây là backend API cho ứng dụng đặt vé xem phim, cung cấp các chức năng:
- Xác thực và phân quyền người dùng
- Quản lý phim và rạp chiếu
- Đặt vé và quản lý booking
- Gửi email xác thực với OTP
- JWT-based authentication

## Yêu cầu hệ thống

- Node.js (v18 trở lên)
- MySQL (v8 trở lên)
- npm hoặc yarn

## Hướng dẫn Setup lần đầu

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Tạo file .env

Tạo file `.env` trong thư mục root với nội dung:

```env
DATABASE_URL="mysql://username:password@localhost:3306/web_movie"

ACCESS_TOKEN_SECRET=project1 intership
ACCESS_TOKEN_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET= lam web movie
REFRESH_TOKEN_EXPIRES_IN=1d

ADMIN_PASSWORD=khai
ADMIN_EMAIL=khai@gmail.com
ADMIN_NAME=khai

OTP_EXPIRES_IN=60s
RESEND_API_KEY=re_gWaGSKZ4_GFbsDAsga7x9HjR3mzJkkyNt
```

**Lưu ý quan trọng:**
- Thay `username`, `password` trong `DATABASE_URL` bằng thông tin MySQL của bạn
- Thay `ACCESS_TOKEN_SECRET` và `REFRESH_TOKEN_SECRET` bằng chuỗi ngẫu nhiên bảo mật
- Nếu không sử dụng email service, có thể để `RESEND_API_KEY` bất kỳ giá trị nào

### 3. Chạy Database Migrations

```bash
npx prisma migrate dev
```

### 4. Khởi tạo dữ liệu ban đầu

Chạy script để tạo roles và admin user:

```bash
npm run init-seed-data
```

Script này sẽ tạo:
- Role "Admin" và "Client"
- User admin với thông tin từ file .env

### 5. Chạy ứng dụng

```bash
# Development mode
npm run start:dev
```

API sẽ chạy tại: `http://localhost:3000`

## Các lệnh thường dùng

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm run start:dev

# Build project
npm run build

# Chạy production
npm run start:prod

# Khởi tạo dữ liệu ban đầu
npm run init-seed-data

# Database migrations
npx prisma migrate dev
npx prisma generate

# Reset database
npx prisma migrate reset

# Xem database trong Prisma Studio
npx prisma studio
```

## License
