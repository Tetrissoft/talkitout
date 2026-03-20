import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionNoteDto } from './dto/create-session-note.dto';
import { UpdateSessionNoteDto } from './dto/update-session-note.dto';

@Injectable()
export class SessionNotesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSessionNoteDto, userId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
    });

    if (!doctor) {
      throw new ForbiddenException('Only doctors can create session notes');
    }

    return this.prisma.sessionNote.create({
      data: {
        appointmentId: dto.appointmentId,
        doctorId: doctor.id,
        customerId: dto.customerId,
        content: dto.content,
        isPrivate: dto.isPrivate ?? true,
      },
      include: {
        doctor: { include: { user: { select: { name: true, email: true } } } },
        customer: { include: { user: { select: { name: true, email: true } } } },
        appointment: true,
      },
    });
  }

  async findAll(userId: string, userRole: string) {
    const where: any = {};

    if (userRole === 'therapist') {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
      if (doctor) {
        const internIds = await this.prisma.doctor.findMany({
          where: { assignedToId: doctor.id },
          select: { id: true },
        });
        where.doctorId = { in: [doctor.id, ...internIds.map((i) => i.id)] };
      }
    } else if (userRole === 'intern') {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
      if (doctor) {
        where.doctorId = doctor.id;
      }
    }

    return this.prisma.sessionNote.findMany({
      where,
      include: {
        doctor: { include: { user: { select: { name: true, email: true } } } },
        customer: { include: { user: { select: { name: true, email: true } } } },
        appointment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.sessionNote.findMany({
      where: { customerId },
      include: {
        doctor: { include: { user: { select: { name: true, email: true } } } },
        appointment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const note = await this.prisma.sessionNote.findUnique({
      where: { id },
      include: {
        doctor: { include: { user: { select: { name: true, email: true } } } },
        customer: { include: { user: { select: { name: true, email: true } } } },
        appointment: true,
      },
    });

    if (!note) {
      throw new NotFoundException('Session note not found');
    }

    return note;
  }

  async update(id: string, dto: UpdateSessionNoteDto, userId: string) {
    const note = await this.findOne(id);
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });

    if (!doctor || note.doctorId !== doctor.id) {
      throw new ForbiddenException('You can only edit your own notes');
    }

    return this.prisma.sessionNote.update({
      where: { id },
      data: dto,
      include: {
        doctor: { include: { user: { select: { name: true, email: true } } } },
        customer: { include: { user: { select: { name: true, email: true } } } },
        appointment: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.sessionNote.delete({ where: { id } });
  }
}
