# Notification System - Microservices Architecture

A distributed notification system built with NestJS, RabbitMQ, PostgreSQL, and Redis.

## 🏗️ Architecture

This project implements a microservices architecture with 5 independent services:

- **API Gateway** - Entry point for all notification requests
- **User Service** - Manages user data and preferences
- **Template Service** - Handles notification templates
- **Email Service** - Processes email notifications
- **Push Service** - Processes push notifications

## 🚀 Tech Stack

- **Framework**: NestJS
- **Message Queue**: RabbitMQ
- **Database**: PostgreSQL (one per service)
- **Cache**: Redis
- **Containerization**: Docker
- **Language**: TypeScript

## 📁 Project Structure

```
notification-system/
├── api-gateway/          # HTTP server (entry point)
├── user-service/          # User management microservice
├── template-service/      # Template management microservice
├── email-service/         # Email notification microservice
├── push-service/          # Push notification microservice
├── shared/                # Shared code (DTOs, interfaces, configs)
├── docker-compose.yml     # Infrastructure setup
└── README.md
```

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone git@github.com:Heba-WebDev/Notification-System.git
cd Notification-System
```

2. Start infrastructure services:
```bash
docker compose up -d
```

3. Install dependencies for each service:
```bash
# Install shared library dependencies
cd shared && npm install && npm run build && cd ..

# Install service dependencies
cd api-gateway && npm install && cd ..
cd user-service && npm install && cd ..
cd template-service && npm install && cd ..
cd email-service && npm install && cd ..
cd push-service && npm install && cd ..
```

4. Start services:
```bash
# In separate terminals
cd api-gateway && npm run start:dev
cd user-service && npm run start:dev
cd template-service && npm run start:dev
cd email-service && npm run start:dev
cd push-service && npm run start:dev
```

## 📚 Services

### API Gateway
- Port: 3000
- Endpoint: `http://localhost:3000/api`

### Infrastructure
- **RabbitMQ**: `http://localhost:15672` (Management UI)
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

## 🔧 Development

### Running Services

Each service can be run independently:

```bash
cd <service-name>
npm run start:dev
```

### Building Shared Library

```bash
cd shared
npm run build
```

## 📝 Naming Conventions

- **Request/Response/Models**: `snake_case`
- **Files**: `kebab-case`
- **Variables**: `camelCase`

## 🧪 Testing

```bash
# Run tests for a service
cd <service-name>
npm test
```

## 📄 License

ISC

## 👤 Author

Heba Omar

