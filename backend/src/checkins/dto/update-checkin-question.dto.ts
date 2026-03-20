import { PartialType } from '@nestjs/swagger';
import { CreateCheckInQuestionDto } from './create-checkin-question.dto';

export class UpdateCheckInQuestionDto extends PartialType(CreateCheckInQuestionDto) {}
