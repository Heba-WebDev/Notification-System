# API Gateway Test Script

## 🧪 How to Run Tests

### Prerequisites

1. **Start Infrastructure:**
   ```bash
   cd notification-system
   docker compose up -d
   ```

2. **Start Services:**
   ```bash
   # Terminal 1: User Service
   cd user-service
   npm run start:dev

   # Terminal 2: Template Service
   cd template-service
   npm run start:dev

   # Terminal 3: API Gateway
   cd api-gateway
   npm run start:dev
   ```

### Run Tests

```bash
cd api-gateway
npm run test:api
```

## 📋 What the Test Script Does

The test script automatically:
1. ✅ Creates a test user (if User Service is running)
2. ✅ Creates a test template (if Template Service is running)
3. ✅ Tests all API Gateway endpoints:
   - Health check
   - Send email notification (valid)
   - Send push notification (valid)
   - Invalid user ID (error handling)
   - Invalid template ID (error handling)
   - Missing required fields (validation)
   - Invalid notification type (validation)

## 🎯 Expected Results

- ✅ **Health Check**: Should return `200` with success message
- ✅ **Valid Notifications**: Should return `200` with `request_id`
- ✅ **Invalid User**: Should return `404` with "User not found"
- ✅ **Invalid Template**: Should return `404` with "Template not found"
- ✅ **Missing Fields**: Should return `400` with validation errors
- ✅ **Invalid Type**: Should return `400` with validation errors

## 🔍 Manual Testing with curl

You can also test manually with curl:

### Health Check
```bash
curl http://localhost:3000/api/api/notifications/health
```

### Send Notification
```bash
curl -X POST http://localhost:3000/api/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "user_id": "YOUR_USER_ID",
    "template_id": "YOUR_TEMPLATE_ID",
    "variables": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }'
```

## 📝 Notes

- The test script will automatically create test users and templates
- If services are not running, some tests will be skipped
- Make sure all services are running before running the full test suite

