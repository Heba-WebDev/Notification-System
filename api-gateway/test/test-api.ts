import axios from 'axios';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

const API_BASE_URL = 'http://localhost:3000/api/notifications';

interface TestResult {
  name: string;
  passed: boolean;
  response?: any;
  error?: string;
}

// Helper function to get a real user ID
async function getRealUserId(): Promise<string | null> {
  try {
    const userClient = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://admin:password@localhost:5672'],
        queue: 'user_queue',
      },
    });

    // Try to create a test user first with timeout
    const createResponse = (await Promise.race([
      firstValueFrom(
        userClient.send('user.create', {
          name: 'Test User',
          email: `test-${Date.now()}@example.com`,
          push_token: null,
        }),
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000),
      ),
    ])) as any;

    if (createResponse.success && createResponse.data?.id) {
      await userClient.close();
      return createResponse.data.id;
    }

    await userClient.close();
    return null;
  } catch (error) {
    console.log(
      '⚠️  Could not get user ID automatically (services may not be running)',
    );
    return null;
  }
}

// Helper function to get a real template ID
async function getRealTemplateId(): Promise<string | null> {
  try {
    const templateClient = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://admin:password@localhost:5672'],
        queue: 'template_queue',
      },
    });

    // Create a test template with timeout
    const createResponse = (await Promise.race([
      firstValueFrom(
        templateClient.send('template.create', {
          name: 'test-notification',
          type: 'email',
          language: 'en',
          subject: 'Test {{name}}',
          body: 'Hello {{name}}, this is a test.',
          variables: ['name'],
          version: 1,
        }),
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000),
      ),
    ])) as any;

    if (createResponse.success && createResponse.data?.id) {
      await templateClient.close();
      return createResponse.data.id;
    }

    await templateClient.close();
    return null;
  } catch (error) {
    console.log(
      '⚠️  Could not get template ID automatically (services may not be running)',
    );
    return null;
  }
}

async function runTests() {
  const results: TestResult[] = [];

  console.log('🧪 Testing API Gateway Endpoints...\n');

  // Get real IDs for testing
  console.log('📋 Preparing test data...');
  console.log('   (This may take a few seconds if services are not running)\n');
  const userId = await getRealUserId();
  const templateId = await getRealTemplateId();

  if (!userId || !templateId) {
    console.log(
      '\n⚠️  WARNING: Could not automatically get user/template IDs.',
    );
    console.log(
      '   Some tests will be skipped. Make sure User Service and Template Service are running.\n',
    );
  } else {
    console.log(`✅ User ID: ${userId}`);
    console.log(`✅ Template ID: ${templateId}\n`);
  }

  // Test 1: Health Check
  console.log('1️⃣ Testing: GET /api/notifications/health');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    const passed = response.status === 200 && response.data.success === true;
    results.push({
      name: 'Health Check',
      passed,
      response: response.data,
    });
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  } catch (error: any) {
    results.push({
      name: 'Health Check',
      passed: false,
      error: error.message,
    });
    console.log('❌ Error:', error.message, '\n');
  }

  // Test 2: Send Email Notification (Valid) - Only if we have IDs
  if (userId && templateId) {
    console.log('2️⃣ Testing: POST /api/notifications/send (Email - Valid)');
    try {
      const response = await axios.post(`${API_BASE_URL}/send`, {
        type: 'email',
        user_id: userId,
        template_id: templateId,
        variables: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      });
      const passed =
        (response.status === 200 || response.status === 201) &&
        response.data.success === true &&
        response.data.data?.request_id;
      results.push({
        name: 'Send Email Notification (Valid)',
        passed,
        response: response.data,
      });
      console.log('✅ Response:', JSON.stringify(response.data, null, 2));
      if (!passed) {
        console.log('Debug - Status:', response.status);
        console.log('Debug - success:', response.data.success);
        console.log('Debug - request_id:', response.data.data?.request_id);
      }
      console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
    } catch (error: any) {
      results.push({
        name: 'Send Email Notification (Valid)',
        passed: false,
        error: error.response?.data || error.message,
      });
      console.log('❌ Error:', error.response?.data || error.message, '\n');
    }

    // Test 3: Send Push Notification (Valid)
    console.log('3️⃣ Testing: POST /api/notifications/send (Push - Valid)');
    try {
      const response = await axios.post(`${API_BASE_URL}/send`, {
        type: 'push',
        user_id: userId,
        template_id: templateId,
        variables: {
          name: 'Jane Doe',
          message: 'Hello from push notification!',
        },
      });
      const passed =
        (response.status === 200 || response.status === 201) &&
        response.data.success === true &&
        response.data.data?.request_id;
      results.push({
        name: 'Send Push Notification (Valid)',
        passed,
        response: response.data,
      });
      console.log('✅ Response:', JSON.stringify(response.data, null, 2));
      if (!passed) {
        console.log('Debug - Status:', response.status);
        console.log('Debug - success:', response.data.success);
        console.log('Debug - request_id:', response.data.data?.request_id);
      }
      console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
    } catch (error: any) {
      results.push({
        name: 'Send Push Notification (Valid)',
        passed: false,
        error: error.response?.data || error.message,
      });
      console.log('❌ Error:', error.response?.data || error.message, '\n');
    }
  } else {
    console.log(
      '⏭️  Skipping valid notification tests (no user/template IDs)\n',
    );
    results.push({
      name: 'Send Email Notification (Valid)',
      passed: false,
      error: 'Skipped - no user/template IDs',
    });
    results.push({
      name: 'Send Push Notification (Valid)',
      passed: false,
      error: 'Skipped - no user/template IDs',
    });
  }

  // Test 4: Invalid User ID
  console.log('4️⃣ Testing: POST /api/notifications/send (Invalid User)');
  try {
    const response = await axios.post(`${API_BASE_URL}/send`, {
      type: 'email',
      user_id: '00000000-0000-0000-0000-000000000000', // Non-existent user
      template_id: templateId || '00000000-0000-0000-0000-000000000000',
      variables: {},
    });
    results.push({
      name: 'Invalid User ID',
      passed: false,
      response: response.data,
      error: 'Expected 404 but got 200',
    });
    console.log('❌ Expected 404 but got:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2), '\n');
  } catch (error: any) {
    const passed = error.response?.status === 404;
    results.push({
      name: 'Invalid User ID',
      passed,
      error: error.response?.data || error.message,
    });
    console.log(
      `${passed ? '✅' : '❌'} Status: ${error.response?.status || 'N/A'}`,
    );
    console.log(
      'Response:',
      JSON.stringify(error.response?.data || error.message, null, 2),
      '\n',
    );
  }

  // Test 5: Invalid Template ID
  console.log('5️⃣ Testing: POST /api/notifications/send (Invalid Template)');
  try {
    const response = await axios.post(`${API_BASE_URL}/send`, {
      type: 'email',
      user_id: userId || '00000000-0000-0000-0000-000000000000',
      template_id: '00000000-0000-0000-0000-000000000000', // Non-existent template
      variables: {},
    });
    results.push({
      name: 'Invalid Template ID',
      passed: false,
      response: response.data,
      error: 'Expected 404 but got 200',
    });
    console.log('❌ Expected 404 but got:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2), '\n');
  } catch (error: any) {
    const passed = error.response?.status === 404;
    results.push({
      name: 'Invalid Template ID',
      passed,
      error: error.response?.data || error.message,
    });
    console.log(
      `${passed ? '✅' : '❌'} Status: ${error.response?.status || 'N/A'}`,
    );
    console.log(
      'Response:',
      JSON.stringify(error.response?.data || error.message, null, 2),
      '\n',
    );
  }

  // Test 6: Missing Required Fields
  console.log('6️⃣ Testing: POST /api/notifications/send (Missing Fields)');
  try {
    const response = await axios.post(`${API_BASE_URL}/send`, {
      type: 'email',
      // Missing user_id and template_id
      variables: {},
    });
    results.push({
      name: 'Missing Required Fields',
      passed: false,
      response: response.data,
      error: 'Expected 400 but got 200',
    });
    console.log('❌ Expected 400 but got:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2), '\n');
  } catch (error: any) {
    const passed = error.response?.status === 400;
    results.push({
      name: 'Missing Required Fields',
      passed,
      error: error.response?.data || error.message,
    });
    console.log(
      `${passed ? '✅' : '❌'} Status: ${error.response?.status || 'N/A'}`,
    );
    console.log(
      'Response:',
      JSON.stringify(error.response?.data || error.message, null, 2),
      '\n',
    );
  }

  // Test 7: Invalid Notification Type
  console.log('7️⃣ Testing: POST /api/notifications/send (Invalid Type)');
  try {
    const response = await axios.post(`${API_BASE_URL}/send`, {
      type: 'invalid_type', // Invalid type
      user_id: userId || '00000000-0000-0000-0000-000000000000',
      template_id: templateId || '00000000-0000-0000-0000-000000000000',
      variables: {},
    });
    results.push({
      name: 'Invalid Notification Type',
      passed: false,
      response: response.data,
      error: 'Expected 400 but got 200',
    });
    console.log('❌ Expected 400 but got:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2), '\n');
  } catch (error: any) {
    const passed = error.response?.status === 400;
    results.push({
      name: 'Invalid Notification Type',
      passed,
      error: error.response?.data || error.message,
    });
    console.log(
      `${passed ? '✅' : '❌'} Status: ${error.response?.status || 'N/A'}`,
    );
    console.log(
      'Response:',
      JSON.stringify(error.response?.data || error.message, null, 2),
      '\n',
    );
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log('='.repeat(50));
  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${index + 1}. ${result.name}: ${status}`);
    if (result.error && !result.passed) {
      console.log(`   Error: ${result.error}`);
    }
  });
  console.log('='.repeat(50));
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(
    `\nTotal: ${passedCount}/${totalCount} tests passed (${Math.round((passedCount / totalCount) * 100)}%)`,
  );
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
