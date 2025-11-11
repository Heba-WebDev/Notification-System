export const RABBITMQ_CONFIG = {
  urls: ['amqp://admin:password@localhost:5672'],
  exchange: 'notifications.direct',
  queues: {
    email: 'email.queue',
    push: 'push.queue',
    failed: 'failed.queue',
    user: 'user_queue',
    template: 'template_queue',
    auth: 'auth_queue',
  },
  routingKeys: {
    email: 'email',
    push: 'push',
  },
};
