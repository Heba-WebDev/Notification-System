# Multi-stage build for Push Service
FROM node:18-alpine AS builder

# Create the directory structure that matches tsconfig expectations
# tsconfig expects: ../shared relative to push-service
WORKDIR /app/notification-system

# Copy shared package
COPY shared ./shared
WORKDIR /app/notification-system/shared
RUN npm install && npm run build

# Copy Push Service code
WORKDIR /app/notification-system
COPY push-service/package*.json ./push-service/
COPY push-service/tsconfig*.json ./push-service/
COPY push-service/nest-cli.json ./push-service/
COPY push-service/src ./push-service/src

# Build Push Service (from push-service directory, ../shared will resolve correctly)
WORKDIR /app/notification-system/push-service
RUN npm install
RUN npm run build

FROM node:18-alpine

WORKDIR /app

# Copy built shared package (already built in builder stage)
COPY --from=builder /app/notification-system/shared/dist ./shared/dist
COPY --from=builder /app/notification-system/shared/package.json ./shared/
COPY --from=builder /app/notification-system/shared/node_modules ./shared/node_modules

# Copy built Push Service
COPY --from=builder /app/notification-system/push-service/dist ./dist
COPY --from=builder /app/notification-system/push-service/package*.json ./
# Install production dependencies (including amqplib which is needed for RabbitMQ)
RUN npm install --production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "process.exit(0)"

# Start application
CMD ["node", "dist/push-service/src/main.js"]

