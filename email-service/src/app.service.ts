import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailLog } from './entities/email-log.entity';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

@Injectable()
export class AppService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password',
      },
    });
  }

  async processEmailNotification(
    data: {
      request_id: string;
      user: any;
      template: any;
      variables: Record<string, any>;
    },
    retryCount: number = 0,
  ): Promise<void> {
    const maxRetries = 3;

    try {
      const existing = await this.emailLogRepository.findOne({
        where: { request_id: data.request_id },
      });

      if (existing) {
        console.log(`Email ${data.request_id} already processed`);
        return;
      }

      const emailLog = this.emailLogRepository.create({
        request_id: data.request_id,
        user_id: data.user.id,
        email: data.user.email,
        subject: data.template.subject,
        body: data.template.body,
        status: 'pending',
      });

      await this.emailLogRepository.save(emailLog);

      // Substitute variables
      let subject = data.template.subject;
      let body = data.template.body;

      Object.keys(data.variables).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, data.variables[key] || '');
        body = body.replace(regex, data.variables[key] || '');
      });

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to: data.user.email,
        subject: subject,
        html: body,
      });

      emailLog.status = 'sent';
      await this.emailLogRepository.save(emailLog);

      console.log(`Email sent successfully: ${data.request_id}`);
    } catch (error) {
      console.error(`Failed to send email: ${error.message}`);

      if (retryCount < maxRetries) {
        // Exponential backoff: 2^retryCount * 1000ms
        // Attempt 1: 1s, Attempt 2: 2s, Attempt 3: 4s
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(
          `Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.processEmailNotification(data, retryCount + 1);
      }

      // Max retries reached
      const emailLog = await this.emailLogRepository.findOne({
        where: { request_id: data.request_id },
      });

      if (emailLog) {
        emailLog.status = 'failed';
        emailLog.error_message = error.message;
        await this.emailLogRepository.save(emailLog);
      }

      throw error; // Re-throw to trigger RabbitMQ retry/dead-letter queue
    }
  }
}
