import { IsString, IsEmail, IsOptional, IsObject, IsBoolean, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserPreferenceDto {
  @ApiPropertyOptional({
    description: 'Email notifications enabled',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({
    description: 'Push notifications enabled',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  push?: boolean;
}

/**
 * CreateUserDto
 */
export class CreateUserDto {
  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Web push subscription token. Empty string will be converted to null.',
    example: '{"endpoint":"https://...","keys":{...}}',
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Convert empty string, null, or undefined to null
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    return value;
  })
  @ValidateIf((o) => o.push_token !== null && o.push_token !== undefined)
  @IsString({ message: 'push_token must be a string if provided' })
  push_token?: string | null;

  @ApiPropertyOptional({
    description: 'User notification preferences',
    type: UserPreferenceDto,
    default: { email: true, push: true },
  })
  @IsOptional()
  @IsObject()
  preferences?: UserPreferenceDto;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
  })
  @IsString()
  password!: string;
}

