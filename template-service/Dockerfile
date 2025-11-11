# Multi-stage build for Template Service
FROM node:18-alpine AS builder

# Create the directory structure that matches tsconfig expectations
# tsconfig expects: ../shared relative to template-service
WORKDIR /app/notification-system

# Copy shared package
COPY shared ./shared
WORKDIR /app/notification-system/shared
RUN npm install && npm run build

# Copy Template Service code
WORKDIR /app/notification-system
COPY template-service/package*.json ./template-service/
COPY template-service/tsconfig*.json ./template-service/
COPY template-service/nest-cli.json ./template-service/
COPY template-service/src ./template-service/src

# Build Template Service (from template-service directory, ../shared will resolve correctly)
WORKDIR /app/notification-system/template-service
RUN npm install
RUN npm run build

FROM node:18-alpine

WORKDIR /app

# Copy built shared package (already built in builder stage)
COPY --from=builder /app/notification-system/shared/dist ./shared/dist
COPY --from=builder /app/notification-system/shared/package.json ./shared/
COPY --from=builder /app/notification-system/shared/node_modules ./shared/node_modules

# Copy built Template Service
COPY --from=builder /app/notification-system/template-service/dist ./dist
COPY --from=builder /app/notification-system/template-service/package*.json ./
# Install production dependencies (including amqplib which is needed for RabbitMQ)
RUN npm install --production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "process.exit(0)"

# Start application
CMD ["node", "dist/template-service/src/main.js"]

