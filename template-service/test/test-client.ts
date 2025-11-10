import { ClientProxyFactory, Transport } from '@nestjs/microservices';

async function testTemplateService() {
  // Create client to connect to RabbitMQ
  const client = ClientProxyFactory.create({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://admin:password@localhost:5672'],
      queue: 'template_queue',
    },
  });

  try {
    console.log('🧪 Testing Template Service Message Patterns...\n');

    // Test 1: Get non-existent template by ID
    console.log('1️⃣ Testing: template.get_by_id (non-existent)');
    const getNonExistent = await client
      .send('template.get_by_id', {
        template_id: '00000000-0000-0000-0000-000000000000',
      })
      .toPromise();
    console.log('Response:', JSON.stringify(getNonExistent, null, 2));
    console.log('Expected: success: false, error: TEMPLATE_NOT_FOUND\n');

    // Test 2: Get non-existent template by name
    console.log('2️⃣ Testing: template.get_by_name (non-existent)');
    const getByNameNonExistent = await client
      .send('template.get_by_name', {
        name: 'non-existent-template',
        type: 'email',
        language: 'en',
      })
      .toPromise();
    console.log('Response:', JSON.stringify(getByNameNonExistent, null, 2));
    console.log('Expected: success: false, error: TEMPLATE_NOT_FOUND\n');

    // Test 3: Create template
    console.log('3️⃣ Testing: template.create');
    const createResponse = await client
      .send('template.create', {
        name: 'welcome-email',
        type: 'email',
        language: 'en',
        subject: 'Welcome {{name}}!',
        body: 'Hello {{name}}, welcome to our service! Your email is {{email}}.',
        variables: ['name', 'email'],
        version: 1,
      })
      .toPromise();
    console.log('Response:', JSON.stringify(createResponse, null, 2));

    if (createResponse.success && createResponse.data) {
      const templateId = createResponse.data.id;
      console.log(`✅ Template created with ID: ${templateId}\n`);

      // Test 4: Get created template by ID
      console.log('4️⃣ Testing: template.get_by_id (existing)');
      const getByIdResponse = await client
        .send('template.get_by_id', {
          template_id: templateId,
        })
        .toPromise();
      console.log('Response:', JSON.stringify(getByIdResponse, null, 2));
      console.log('Expected: success: true, with template data\n');

      // Test 5: Get template by name
      console.log('5️⃣ Testing: template.get_by_name');
      const getByNameResponse = await client
        .send('template.get_by_name', {
          name: 'welcome-email',
          type: 'email',
          language: 'en',
        })
        .toPromise();
      console.log('Response:', JSON.stringify(getByNameResponse, null, 2));
      console.log('Expected: success: true, with template data\n');
    }

    // Test 6: Test variable substitution
    console.log('6️⃣ Testing: template.substitute');
    const substituteTest = await client
      .send('template.substitute', {
        template: {
          subject: 'Welcome {{name}}!',
          body: 'Hello {{name}}, your email is {{email}}.',
        },
        variables: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
      .toPromise();
    console.log('Response:', JSON.stringify(substituteTest, null, 2));
    console.log(
      'Expected: subject: "Welcome John Doe!", body: "Hello John Doe, your email is john@example.com."\n',
    );

    // Test 7: Test with missing variables
    console.log('7️⃣ Testing: template.substitute (missing variables)');
    const substituteMissing = await client
      .send('template.substitute', {
        template: {
          subject: 'Welcome {{name}}!',
          body: 'Hello {{name}}, your email is {{email}}.',
        },
        variables: {
          name: 'Jane Doe',
          // email missing
        },
      })
      .toPromise();
    console.log('Response:', JSON.stringify(substituteMissing, null, 2));
    console.log('Expected: email should be empty string\n');

    // Test 8: Invalid UUID format
    console.log('8️⃣ Testing: template.get_by_id (invalid UUID)');
    const invalidUuid = await client
      .send('template.get_by_id', {
        template_id: 'invalid-uuid-format',
      })
      .toPromise();
    console.log('Response:', JSON.stringify(invalidUuid, null, 2));
    console.log('Expected: success: false, error: INVALID_UUID\n');
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  } finally {
    await client.close();
    console.log('✅ Test completed. Connection closed.');
    process.exit(0);
  }
}

testTemplateService();

