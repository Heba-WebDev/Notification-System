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

  async checkDatabase(): Promise<void> {
    await this.templateRepository.query('SELECT 1');
  }

  async getAllTemplates(
    page: number = 1,
    limit: number = 10,
    type?: string,
    language: string = 'en',
  ): Promise<{ templates: Template[]; total: number }> {
    // First, get all templates with filters to group by unique (name, type, language)
    const queryBuilder = this.templateRepository.createQueryBuilder('template');

    if (type) {
      queryBuilder.where('template.type = :type', { type });
    }

    if (language) {
      queryBuilder.andWhere('template.language = :language', { language });
    }

    queryBuilder
      .orderBy('template.name', 'ASC')
      .addOrderBy('template.version', 'DESC');

    const allTemplates = await queryBuilder.getMany();

    // Group by name, type, language and take latest version
    const templateMap = new Map<string, Template>();
    allTemplates.forEach((template) => {
      const key = `${template.name}-${template.type}-${template.language}`;
      const existing = templateMap.get(key);
      if (!existing || template.version > existing.version) {
        templateMap.set(key, template);
      }
    });

    const uniqueTemplates = Array.from(templateMap.values());
    const total = uniqueTemplates.length;

    // Apply pagination to unique templates
    const skip = (page - 1) * limit;
    const paginatedTemplates = uniqueTemplates.slice(skip, skip + limit);

    return {
      templates: paginatedTemplates,
      total,
    };
  }
}
