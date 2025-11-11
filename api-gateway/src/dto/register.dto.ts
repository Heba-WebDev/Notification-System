import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Registration DTO
 * Used for creating a new user account
 */
export class RegisterDto {
  @ApiProperty({
    description: 'User email address (must be valid email format)',
    example: 'user@example.com',
    type: String,
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'SecurePassword123!',
    type: String,
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
