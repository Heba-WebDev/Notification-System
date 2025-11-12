import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './entities/template.entity';

@Injectable()
export class TemplateSeeder implements OnModuleInit {
  private readonly logger = new Logger(TemplateSeeder.name);

  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
  ) {}

  async onModuleInit() {
    // Wait a bit for database to be ready
    await this.delay(2000);
    await this.seedTemplates();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async seedTemplates() {
    this.logger.log('Starting template seeding...');

    try {
      // Welcome Email Template
      await this.ensureTemplate({
        name: 'welcome-email',
        type: 'email',
        language: 'en',
        subject: 'Welcome to our service, {{name}}!',
        body: `Hello {{name}},

Welcome to our notification service! We're excited to have you on board.

Your account has been successfully created with the email: {{email}}.

If you have any questions, feel free to reach out to our support team.

Best regards,
The Notification Team`,
        variables: ['name', 'email'],
        version: 1,
      });

      // Welcome Push Template
      await this.ensureTemplate({
        name: 'welcome-push',
        type: 'push',
        language: 'en',
        subject: 'Welcome {{name}}!',
        body: "Welcome to our service, {{name}}! We're excited to have you on board.",
        variables: ['name'],
        version: 1,
      });

      // Preferences Changed Email Template
      await this.ensureTemplate({
        name: 'preferences-changed-email',
        type: 'email',
        language: 'en',
        subject: 'Your notification preferences have been updated',
        body: `Hello {{name}},

This is to confirm that your notification preferences have been successfully updated.

**Updated Preferences:**
- Email Notifications: {{email_notifications}}
- Push Notifications: {{push_notifications}}
- Language: {{language}}

If you did not make this change, please contact our support team immediately.

Best regards,
The Notification Team`,
        variables: [
          'name',
          'email_notifications',
          'push_notifications',
          'language',
        ],
        version: 1,
      });

      // Preferences Changed Push Template
      await this.ensureTemplate({
        name: 'preferences-changed-push',
        type: 'push',
        language: 'en',
        subject: 'Preferences Updated',
        body: 'Your notification preferences have been updated successfully.',
        variables: [],
        version: 1,
      });

      this.logger.log('Template seeding completed successfully');
    } catch (error) {
      this.logger.error('Error seeding templates:', error);
      // Don't throw - allow service to continue even if seeding fails
    }
  }

  private async ensureTemplate(templateData: {
    name: string;
    type: string;
    language: string;
    subject: string;
    body: string;
    variables: string[];
    version: number;
  }) {
    const existing = await this.templateRepository.findOne({
      where: {
        name: templateData.name,
        type: templateData.type,
        language: templateData.language,
        version: templateData.version,
      },
    });

    if (existing) {
      this.logger.debug(
        `Template ${templateData.name} (${templateData.type}, ${templateData.language}, v${templateData.version}) already exists`,
      );
      return;
    }

    const template = this.templateRepository.create(templateData);
    await this.templateRepository.save(template);
    this.logger.log(
      `Created template: ${templateData.name} (${templateData.type}, ${templateData.language}, v${templateData.version})`,
    );
  }
}
