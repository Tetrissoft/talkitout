import { IsNotEmpty, IsString, IsOptional, IsUUID, IsDateString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'user-uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'intern-uuid-here', required: false })
  @IsUUID()
  @IsOptional()
  assignedInternId?: string;

  @ApiProperty({ example: '1990-01-01', required: false })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({ example: '123 Main St, City, State', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @ApiProperty({ example: 'Patient notes here', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: ['mood', 'anxiety', 'sleep'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  checkinCategories?: string[];
}
