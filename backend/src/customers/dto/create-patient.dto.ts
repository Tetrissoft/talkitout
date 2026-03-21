import { IsNotEmpty, IsString, IsOptional, IsUUID, IsDateString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePatientDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123', required: false })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'intern-uuid-here', required: false })
  @IsUUID()
  @IsOptional()
  assignedInternId?: string;

  @ApiProperty({ example: '1990-01-01', required: false })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({ example: '123 Main St', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @ApiProperty({ example: 'Patient notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
