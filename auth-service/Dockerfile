# Multi-stage build for Auth Service
FROM node:18-alpine AS builder

# Create the directory structure that matches tsconfig expectations
# tsconfig expects: ../shared relative to auth-service
WORKDIR /app/notification-system

# Copy shared package
COPY shared ./shared
WORKDIR /app/notification-system/shared
RUN npm install && npm run build

# Copy Auth Service code
WORKDIR /app/notification-system
COPY auth-service/package*.json ./auth-service/
COPY auth-service/tsconfig*.json ./auth-service/
COPY auth-service/nest-cli.json ./auth-service/
COPY auth-service/src ./auth-service/src

# Build Auth Service (from auth-service directory, ../shared will resolve correctly)
WORKDIR /app/notification-system/auth-service
RUN npm install
RUN npm run build

FROM node:18-alpine

WORKDIR /app

# Copy built shared package (already built in builder stage)
COPY --from=builder /app/notification-system/shared/dist ./shared/dist
COPY --from=builder /app/notification-system/shared/package.json ./shared/
COPY --from=builder /app/notification-system/shared/node_modules ./shared/node_modules

# Copy built Auth Service
COPY --from=builder /app/notification-system/auth-service/dist ./dist
COPY --from=builder /app/notification-system/auth-service/package*.json ./
# Install production dependencies (including amqplib which is needed for RabbitMQ)
RUN npm install --production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "process.exit(0)"

# Start application
CMD ["node", "dist/auth-service/src/main.js"]

