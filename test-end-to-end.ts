import axios from 'axios';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

const API_BASE_URL = 'http://localhost:3000/api';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function testUserService(): Promise<string | null> {
  try {
    const client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://admin:password@localhost:5672'],
        queue: 'user_queue',
      },
    });

    const response = await Promise.race([
      firstValueFrom(
        client.send('user.create', {
          email: `test-${Date.now()}@example.com`,
        }),
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000),
      ),
    ]) as any;

    await client.close();

    if (response.success && response.data?.id) {
      return response.data.id;
    }
    return null;
  } catch (error) {
    console.log('⚠️  User Service not available');
    return null;
  }
}

async function testTemplateService(): Promise<{ emailId: string | null; pushId: string | null }> {
  try {
    const client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://admin:password@localhost:5672'],
        queue: 'template_queue',
      },
    });

    // Create email template
    const emailResponse = await Promise.race([
      firstValueFrom(
        client.send('template.create', {
          name: 'test-email',
          type: 'email',
          language: 'en',
          subject: 'Test Email: Welcome {{name}}!',
          body: 'Hello {{name}}, this is a test email. {{message}}',
          variables: ['name', 'message'],
          version: 1,
        }),
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000),
      ),
    ]) as any;

    // Create push template
    const pushResponse = await Promise.race([
      firstValueFrom(
        client.send('template.create', {
          name: 'test-push',
          type: 'push',
          language: 'en',
          subject: 'Test Push: Welcome {{name}}!',
          body: 'Hello {{name}}, this is a test push notification. {{message}}',
          variables: ['name', 'message'],
          version: 1,
        }),
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000),
      ),
    ]) as any;

    await client.close();

    return {
      emailId: emailResponse.success ? emailResponse.data?.id : null,
      pushId: pushResponse.success ? pushResponse.data?.id : null,
    };
  } catch (error) {
    console.log('⚠️  Template Service not available');
    return { emailId: null, pushId: null };
  }
}

async function runTest(name: string, testFn: () => Promise<any>): Promise<void> {
  try {
    const result = await testFn();
    results.push({
      name,
      status: 'PASS',
      message: 'Test passed',
      details: result,
    });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({
      name,
      status: 'FAIL',
      message: error.message || 'Test failed',
      details: error,
    });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function testEndToEnd() {
  console.log('🧪 Testing Complete End-to-End Flow\n');
  console.log('=' .repeat(60));

  // Test 1: Health Check
  await runTest('API Gateway Health Check', async () => {
    const response = await axios.get(`${API_BASE_URL}/notifications/health`);
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Health check failed');
    }
    return response.data;
  });

  // Test 2: Create Test Data
  console.log('\n📋 Creating test data...');
  const userId = await testUserService();
  const templates = await testTemplateService();

  if (!userId) {
    results.push({
      name: 'Create Test User',
      status: 'FAIL',
      message: 'Could not create test user. Make sure User Service is running.',
    });
  } else {
    results.push({
      name: 'Create Test User',
      status: 'PASS',
      message: `User created: ${userId}`,
      details: { userId },
    });
    console.log(`✅ User created: ${userId}`);
  }

  if (!templates.emailId || !templates.pushId) {
    results.push({
      name: 'Create Test Templates',
      status: 'FAIL',
      message: 'Could not create test templates. Make sure Template Service is running.',
    });
  } else {
    results.push({
      name: 'Create Test Templates',
      status: 'PASS',
      message: `Templates created: Email=${templates.emailId}, Push=${templates.pushId}`,
      details: templates,
    });
    console.log(`✅ Templates created: Email=${templates.emailId}, Push=${templates.pushId}`);
  }

  if (!userId || !templates.emailId || !templates.pushId) {
    console.log('\n⚠️  Cannot continue without test data. Please start all services.');
    printResults();
    process.exit(1);
  }

  // Test 3: Email Notification
  await runTest('Send Email Notification', async () => {
    const response = await axios.post(
      `${API_BASE_URL}/notifications/send`,
      {
        type: 'email',
        user_id: userId,
        template_id: templates.emailId,
        variables: {
          name: 'Test User',
          message: 'This is an end-to-end test!',
        },
      },
      {
        validateStatus: (status) => status < 500,
      },
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Email notification failed');
    }

    return {
      requestId: response.data.data.request_id,
      status: response.status,
    };
  });

  // Test 4: Push Notification
  // First, register a mock push token for the user
  await runTest('Register Push Token for Test User', async () => {
    const mockPushToken = JSON.stringify({
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-token-' + Date.now(),
      keys: {
        p256dh: 'test-p256dh-key-base64url-encoded',
        auth: 'test-auth-key-base64url-encoded'
      }
    });

    const response = await axios.put(
      `${API_BASE_URL}/users/${userId}/push-token`,
      { push_token: mockPushToken },
      {
        validateStatus: (status) => status < 500,
      },
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to register push token');
    }

    return { registered: true };
  });

  await runTest('Send Push Notification', async () => {
    const response = await axios.post(
      `${API_BASE_URL}/notifications/send`,
      {
        type: 'push',
        user_id: userId,
        template_id: templates.pushId,
        variables: {
          name: 'Test User',
          message: 'This is an end-to-end test!',
        },
      },
      {
        validateStatus: (status) => status < 500,
      },
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Push notification failed');
    }

    return {
      requestId: response.data.data.request_id,
      status: response.status,
    };
  });

  // Test 5: Error Cases
  await runTest('Invalid User ID', async () => {
    const response = await axios.post(
      `${API_BASE_URL}/notifications/send`,
      {
        type: 'email',
        user_id: '00000000-0000-0000-0000-000000000000',
        template_id: templates.emailId,
        variables: {},
      },
      {
        validateStatus: (status) => status < 500,
      },
    );

    if (response.status !== 404) {
      throw new Error(`Expected 404, got ${response.status}`);
    }
    return { status: response.status };
  });

  await runTest('Invalid Template ID', async () => {
    const response = await axios.post(
      `${API_BASE_URL}/notifications/send`,
      {
        type: 'email',
        user_id: userId,
        template_id: '00000000-0000-0000-0000-000000000000',
        variables: {},
      },
      {
        validateStatus: (status) => status < 500,
      },
    );

    if (response.status !== 404) {
      throw new Error(`Expected 404, got ${response.status}`);
    }
    return { status: response.status };
  });

  await runTest('Missing Required Fields', async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/notifications/send`,
        {
          type: 'email',
          // Missing user_id and template_id
        },
      );
      throw new Error('Should have failed validation');
    } catch (error: any) {
      if (error.response?.status === 400) {
        return { status: 400 };
      }
      throw error;
    }
  });

  // Print Results
  printResults();
}

function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  results.forEach((result) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
    if (result.details && typeof result.details === 'object') {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
testEndToEnd().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

