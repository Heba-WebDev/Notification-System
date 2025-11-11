# Swagger API Documentation

## 📚 Overview

The API Gateway now includes comprehensive Swagger/OpenAPI documentation for easy client integration.

## 🔗 Access Swagger UI

Once the API Gateway is running, access the Swagger documentation at:

```
http://localhost:3000/api/docs
```

## ✨ Features

### 1. **Interactive API Explorer**
- Test endpoints directly from the browser
- See request/response examples
- Try it out functionality

### 2. **Authentication Support**
- JWT Bearer token authentication
- Token persists after page refresh
- Easy "Authorize" button to add your token

### 3. **Comprehensive Documentation**
- Clear endpoint descriptions
- Request/response examples
- Error response documentation
- Parameter descriptions

### 4. **Organized by Tags**
- **Authentication**: Register and login endpoints
- **Notifications**: Send email/push notifications
- **Users**: User management (push tokens)
- **Health**: Health check endpoints

## 📋 Documented Endpoints

### Authentication Endpoints
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login with email/password

### Notification Endpoints
- `POST /api/v1/notifications/send` - Send email or push notification (requires auth)
- `GET /api/v1/notifications/health` - Health check

### User Endpoints
- `PUT /api/v1/users/:userId/push-token` - Register push token
- `GET /api/v1/users/push-tokens` - Get all users with push tokens

## 🔐 Using Authentication in Swagger

1. **Get a Token:**
   - Use `POST /api/v1/auth/register` or `POST /api/v1/auth/login`
   - Copy the `token` from the response

2. **Authorize:**
   - Click the "Authorize" button (🔒) at the top of Swagger UI
   - Enter: `Bearer <your-token>`
   - Click "Authorize"
   - Now all protected endpoints will include your token

3. **Test Protected Endpoints:**
   - Try `POST /api/v1/notifications/send`
   - Your token is automatically included in the request

## 📝 Example Requests

### Register User
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

### Send Notification
```json
{
  "type": "email",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "template_id": "123e4567-e89b-12d3-a456-426614174001",
  "variables": {
    "name": "John Doe",
    "amount": 100
  }
}
```

## 🎯 Client Integration Guide

### Step 1: Get Authentication Token

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe"
  }'

# Or Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Step 2: Use Token for Authenticated Requests

```bash
curl -X POST http://localhost:3000/api/v1/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "type": "email",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "template_id": "123e4567-e89b-12d3-a456-426614174001",
    "variables": {
      "name": "John Doe"
    }
  }'
```

## 📖 Response Format

All endpoints return a standardized response:

```json
{
  "success": true|false,
  "message": "Human-readable message",
  "data": { ... },
  "error": "Error message (if success is false)"
}
```

## 🚨 Error Codes

- `400` - Bad Request: Invalid input data
- `401` - Unauthorized: Missing or invalid JWT token
- `404` - Not Found: Resource not found
- `503` - Service Unavailable: Backend service is down

## 💡 Tips for Client Integration

1. **Token Expiration**: JWT tokens expire in 24 hours. Implement token refresh logic.

2. **Error Handling**: Always check the `success` field in responses.

3. **Request IDs**: When sending notifications, save the `request_id` for tracking.

4. **Template Variables**: Use the `variables` object to replace placeholders in templates (e.g., `{{name}}`).

5. **Push Tokens**: For push notifications, register a push token first using the Push Token Manager at `/push-tokens.html`.

## 🔧 Configuration

Swagger is configured in `src/main.ts`:

- **Path**: `/api/docs`
- **Title**: "Notification System API"
- **Version**: "1.0"
- **Bearer Auth**: JWT token support
- **Persist Authorization**: Token persists after page refresh

## 📚 Additional Resources

- **Push Token Manager**: `http://localhost:3000/push-tokens.html`
- **Swagger UI**: `http://localhost:3000/api/docs`
- **Health Check**: `http://localhost:3000/api/v1/notifications/health`

---

**Happy Coding!** 🚀

