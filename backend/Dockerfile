# Sử dụng Node.js LTS
FROM node:20-alpine

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy package files
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Tạo entrypoint script trực tiếp trong container
RUN printf '#!/bin/sh\n\
set -e\n\
echo "Running Prisma migrations..."\n\
MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1) || MIGRATE_EXIT=$?\n\
if [ -n "$MIGRATE_EXIT" ] && echo "$MIGRATE_OUTPUT" | grep -q "P3005"; then\n\
  echo "Database schema exists but migrations not tracked. Using db push to sync..."\n\
  npx prisma db push --skip-generate --accept-data-loss\n\
  echo "Schema synced. Generating Prisma Client..."\n\
else\n\
  echo "$MIGRATE_OUTPUT"\n\
  echo "Generating Prisma Client..."\n\
fi\n\
npx prisma generate\n\
echo "Starting application..."\n\
exec "$@"\n' > /entrypoint.sh && chmod +x /entrypoint.sh

# Copy toàn bộ source code
COPY . .

# Expose port
EXPOSE 3000

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]

# Chạy ở chế độ development
CMD ["npm", "run", "start:dev"]
