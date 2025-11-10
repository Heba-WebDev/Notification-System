import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './entities/template.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
  ) {}

  async getTemplateById(templateId: string): Promise<Template | null> {
    return await this.templateRepository.findOne({
      where: { id: templateId },
    });
  }

  async getTemplateByNameAndType(
    name: string,
    type: string,
    language: string = 'en',
  ): Promise<Template | null> {
    return await this.templateRepository.findOne({
      where: { name, type, language },
      order: { version: 'DESC' }, // latest version
    });
  }

  async substituteVariables(
    template: Template,
    variables: Record<string, any>,
  ): Promise<{ subject: string; body: string }> {
    let subject = template.subject;
    let body = template.body;

    // Replace all {{variable}} with actual values
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, variables[key] || '');
      body = body.replace(regex, variables[key] || '');
    });

    return { subject, body };
  }

  async createTemplate(templateData: Partial<Template>): Promise<Template> {
    const template = this.templateRepository.create(templateData);
    return await this.templateRepository.save(template);
  }
}
