import { ClientProxyFactory, Transport } from '@nestjs/microservices';

async function createPushTemplate() {
  const client = ClientProxyFactory.create({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://admin:password@localhost:5672'],
      queue: 'template_queue',
    },
  });

  try {
    console.log('Creating push notification template...\n');

    const createResponse = await client
      .send('template.create', {
        name: 'welcome-push',
        type: 'push',
        language: 'en',
        subject: 'Welcome {{name}}!',
        body: 'Hello {{name}}, welcome to our service! {{message}}',
        variables: ['name', 'message'],
        version: 1,
      })
      .toPromise();

    if (createResponse.success && createResponse.data) {
      const templateId = createResponse.data.id;
      console.log('✅ Push template created successfully!');
      console.log('');
      console.log('📋 Template ID:', templateId);
      console.log('');
      console.log('Template details:');
      console.log('  Name: welcome-push');
      console.log('  Type: push');
      console.log('  Subject: Welcome {{name}}!');
      console.log('  Body: Hello {{name}}, welcome to our service! {{message}}');
      console.log('  Variables: name, message');
      console.log('');
      console.log('You can now use this Template ID in the Push Token Manager page!');
    } else {
      console.error('❌ Failed to create template:', createResponse);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    process.exit(0);
  }
}

createPushTemplate();

