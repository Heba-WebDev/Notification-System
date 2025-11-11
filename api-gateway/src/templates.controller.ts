import {
  Controller,
  Get,
  Query,
  Inject,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { ResponseDto, PaginationMeta } from '@shared/index';
import { AuthGuard } from './auth.guard';

/**
 * Templates Controller
 * Handles template-related operations
 */
@ApiTags('Templates')
@ApiBearerAuth('JWT-auth')
@Controller('templates')
export class TemplatesController {
  constructor(
    @Inject('TEMPLATE_SERVICE') private readonly templateService: ClientProxy,
  ) {}

  /**
   * Get all templates with pagination
   * Returns a paginated list of all available notification templates.
   * Users can browse templates to see what's available for sending notifications.
   *
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @param type - Filter by notification type (optional: 'email' or 'push')
   * @param language - Filter by language (optional, default: 'en')
   * @returns Paginated list of templates
   */
  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get all templates',
    description: `Returns a paginated list of all available notification templates.
    
**Pagination:**
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 10, max: 100)

**Filters:**
- \`type\`: Filter by notification type ('email' or 'push')
- \`language\`: Filter by language (default: 'en')

**Use Case:**
Users can browse available templates before sending notifications. This helps them:
- See what templates are available
- Choose the right template code for sending notifications
- Understand what variables each template requires`,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    description: 'Filter by notification type (email or push)',
    example: 'email',
  })
  @ApiQuery({
    name: 'language',
    required: false,
    type: String,
    description: 'Filter by language (default: en)',
    example: 'en',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Templates retrieved successfully',
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'welcome-email',
            type: 'email',
            language: 'en',
            subject: 'Welcome {{name}}!',
            variables: ['name', 'link'],
            version: 1,
          },
        ],
        meta: {
          total: 50,
          limit: 10,
          page: 1,
          total_pages: 5,
          has_next: true,
          has_previous: false,
        },
      },
    },
  })
  async getAllTemplates(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('language') language?: string,
  ): Promise<ResponseDto<any>> {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 10;

      if (pageNum < 1) {
        throw new HttpException('Page must be >= 1', HttpStatus.BAD_REQUEST);
      }

      if (limitNum < 1) {
        throw new HttpException('Limit must be >= 1', HttpStatus.BAD_REQUEST);
      }

      const response = await firstValueFrom(
        this.templateService
          .send('template.get_all', {
            page: pageNum,
            limit: limitNum,
            type: type || undefined,
            language: language || 'en',
          })
          .pipe(timeout(3000)),
      );

      if (!response.success) {
        throw new HttpException(
          response.message || 'Failed to retrieve templates',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        message: 'Templates retrieved successfully',
        data: response.data || [],
        meta: response.meta,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to retrieve templates',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

