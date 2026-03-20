import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateSessionNoteDto {
  @IsUUID()
  appointmentId: string;

  @IsUUID()
  customerId: string;

  @IsString()
  content: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean = true;
}
