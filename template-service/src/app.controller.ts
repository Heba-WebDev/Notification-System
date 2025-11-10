import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';
import { Template } from './entities/template.entity';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern('template.get_by_id')
  async getTemplateById(@Payload() data: { template_id: string }) {
    try {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(data.template_id)) {
        return {
          success: false,
          message: 'Invalid template ID format',
          error: 'INVALID_UUID',
        };
      }

      const template = await this.appService.getTemplateById(data.template_id);

      if (!template) {
        return {
          success: false,
          message: 'Template not found',
          error: 'TEMPLATE_NOT_FOUND',
        };
      }

      return {
        success: true,
        message: 'Template retrieved successfully',
        data: template,
      };
    } catch (error) {
      console.error('Error in getTemplateById:', error);
      return {
        success: false,
        message: 'Failed to get template',
        error: error.message || 'Internal server error',
      };
    }
  }

  @MessagePattern('template.get_by_name')
  async getTemplateByName(
    @Payload() data: { name: string; type: string; language?: string },
  ) {
    try {
      const template = await this.appService.getTemplateByNameAndType(
        data.name,
        data.type,
        data.language || 'en',
      );

      if (!template) {
        return {
          success: false,
          message: 'Template not found',
          error: 'TEMPLATE_NOT_FOUND',
        };
      }

      return {
        success: true,
        message: 'Template retrieved successfully',
        data: template,
      };
    } catch (error) {
      console.error('Error in getTemplateByName:', error);
      return {
        success: false,
        message: 'Failed to get template',
        error: error.message || 'Internal server error',
      };
    }
  }

  @MessagePattern('template.create')
  async createTemplate(@Payload() data: Partial<Template>) {
    try {
      const template = await this.appService.createTemplate(data);
      return {
        success: true,
        message: 'Template created successfully',
        data: template,
      };
    } catch (error) {
      console.error('Error in createTemplate:', error);
      return {
        success: false,
        message: 'Failed to create template',
        error: error.message || 'Internal server error',
      };
    }
  }

  @MessagePattern('template.substitute')
  async substituteVariables(
    @Payload() data: { template: Template; variables: Record<string, any> },
  ) {
    try {
      const result = await this.appService.substituteVariables(
        data.template,
        data.variables,
      );

      return {
        success: true,
        message: 'Variables substituted successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to substitute variables',
        error: error.message,
      };
    }
  }
}
