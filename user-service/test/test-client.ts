import { ClientProxyFactory, Transport } from '@nestjs/microservices';

async function testUserService() {
  // Create client to connect to RabbitMQ
  const client = ClientProxyFactory.create({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://admin:password@localhost:5672'],
      queue: 'user_queue',
    },
  });

  try {
    console.log('🧪 Testing User Service Message Patterns...\n');

    // Test 1: Get non-existent user (use valid UUID format)
    console.log('1️⃣ Testing: user.get_by_id (non-existent)');
    const getNonExistent = await client
      .send('user.get_by_id', { user_id: '00000000-0000-0000-0000-000000000000' })
      .toPromise();
    console.log('Response:', JSON.stringify(getNonExistent, null, 2));
    console.log('Expected: success: false, error: USER_NOT_FOUND\n');

    // Test 2: Create user
    console.log('2️⃣ Testing: user.create');
    const createResponse = await client
      .send('user.create', {
        email: 'test@example.com',
        push_token: 'test-push-token-123',
      })
      .toPromise();
    console.log('Response:', JSON.stringify(createResponse, null, 2));

    if (createResponse.success && createResponse.data) {
      const userId = createResponse.data.id;
      console.log(`✅ User created with ID: ${userId}\n`);

      // Test 3: Get created user
      console.log('3️⃣ Testing: user.get_by_id (existing)');
      const getUserResponse = await client
        .send('user.get_by_id', { user_id: userId })
        .toPromise();
      console.log('Response:', JSON.stringify(getUserResponse, null, 2));
      console.log('Expected: success: true, with user data and preferences\n');

      // Test 4: Update user
      console.log('4️⃣ Testing: user.update');
      const updateResponse = await client
        .send('user.update', {
          user_id: userId,
          data: { email: 'updated@example.com' },
        })
        .toPromise();
      console.log('Response:', JSON.stringify(updateResponse, null, 2));
      console.log('Expected: success: true, with updated email\n');

      // Test 5: Verify update
      console.log('5️⃣ Testing: user.get_by_id (after update)');
      const verifyUpdate = await client
        .send('user.get_by_id', { user_id: userId })
        .toPromise();
      console.log('Response:', JSON.stringify(verifyUpdate, null, 2));
      console.log('Expected: email should be "updated@example.com"\n');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  } finally {
    await client.close();
    console.log('✅ Test completed. Connection closed.');
    process.exit(0);
  }
}

testUserService();

