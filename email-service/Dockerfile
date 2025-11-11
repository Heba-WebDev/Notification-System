# Multi-stage build for Email Service
FROM node:18-alpine AS builder

# Create the directory structure that matches tsconfig expectations
# tsconfig expects: ../shared relative to email-service
WORKDIR /app/notification-system

# Copy shared package
COPY shared ./shared
WORKDIR /app/notification-system/shared
RUN npm install && npm run build

# Copy Email Service code
WORKDIR /app/notification-system
COPY email-service/package*.json ./email-service/
COPY email-service/tsconfig*.json ./email-service/
COPY email-service/nest-cli.json ./email-service/
COPY email-service/src ./email-service/src

# Build Email Service (from email-service directory, ../shared will resolve correctly)
WORKDIR /app/notification-system/email-service
RUN npm install
RUN npm run build

FROM node:18-alpine

WORKDIR /app

# Copy built shared package (already built in builder stage)
COPY --from=builder /app/notification-system/shared/dist ./shared/dist
COPY --from=builder /app/notification-system/shared/package.json ./shared/
COPY --from=builder /app/notification-system/shared/node_modules ./shared/node_modules

# Copy built Email Service
COPY --from=builder /app/notification-system/email-service/dist ./dist
COPY --from=builder /app/notification-system/email-service/package*.json ./
# Install production dependencies (including amqplib which is needed for RabbitMQ)
RUN npm install --production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "process.exit(0)"

# Start application
CMD ["node", "dist/email-service/src/main.js"]

