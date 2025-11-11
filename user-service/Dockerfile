# Multi-stage build for User Service
FROM node:18-alpine AS builder

# Create the directory structure that matches tsconfig expectations
# tsconfig expects: ../shared relative to user-service
WORKDIR /app/notification-system

# Copy shared package
COPY shared ./shared
WORKDIR /app/notification-system/shared
RUN npm install && npm run build

# Copy User Service code
WORKDIR /app/notification-system
COPY user-service/package*.json ./user-service/
COPY user-service/tsconfig*.json ./user-service/
COPY user-service/nest-cli.json ./user-service/
COPY user-service/src ./user-service/src

# Build User Service (from user-service directory, ../shared will resolve correctly)
WORKDIR /app/notification-system/user-service
RUN npm install
RUN npm run build

FROM node:18-alpine

WORKDIR /app

# Copy built shared package (already built in builder stage)
COPY --from=builder /app/notification-system/shared/dist ./shared/dist
COPY --from=builder /app/notification-system/shared/package.json ./shared/
COPY --from=builder /app/notification-system/shared/node_modules ./shared/node_modules

# Copy built User Service
COPY --from=builder /app/notification-system/user-service/dist ./dist
COPY --from=builder /app/notification-system/user-service/package*.json ./
# Install production dependencies (including amqplib which is needed for RabbitMQ)
RUN npm install --production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "process.exit(0)"

# Start application
CMD ["node", "dist/user-service/src/main.js"]

