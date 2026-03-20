import { PartialType } from '@nestjs/swagger';
import { CreateSessionNoteDto } from './create-session-note.dto';

export class UpdateSessionNoteDto extends PartialType(CreateSessionNoteDto) {}
