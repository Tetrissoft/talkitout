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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    let doctorId: string;

    if (user?.role === 'admin') {
      // Admin can create notes — use the appointment's doctor as the author,
      // or if dto.doctorId is provided, use that
      if (dto.appointmentId) {
        const appointment = await this.prisma.appointment.findUnique({
          where: { id: dto.appointmentId },
        });
        if (!appointment) {
          throw new NotFoundException('Appointment not found');
        }
        doctorId = appointment.doctorId;
      } else {
        throw new ForbiddenException('Admin must provide an appointmentId');
      }
    } else {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId },
      });
      if (!doctor) {
        throw new ForbiddenException('Only doctors or admins can create session notes');
      }
      doctorId = doctor.id;
    }

    const note = await this.prisma.sessionNote.create({
      data: {
        appointmentId: dto.appointmentId,
        doctorId,
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

    return { success: true, data: note };
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

    const notes = await this.prisma.sessionNote.findMany({
      where,
      include: {
        doctor: { include: { user: { select: { name: true, email: true } } } },
        customer: { include: { user: { select: { name: true, email: true } } } },
        appointment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: notes };
  }

  async findByCustomer(customerId: string) {
    const notes = await this.prisma.sessionNote.findMany({
      where: { customerId },
      include: {
        doctor: { include: { user: { select: { name: true, email: true } } } },
        appointment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: notes };
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

    return { success: true, data: note };
  }

  async update(id: string, dto: UpdateSessionNoteDto, userId: string) {
    const result = await this.findOne(id);
    const note = result.data;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    // Admin can edit any note; therapist/intern can only edit their own
    if (user?.role !== 'admin') {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
      if (!doctor || note.doctorId !== doctor.id) {
        throw new ForbiddenException('You can only edit your own notes');
      }
    }

    const updated = await this.prisma.sessionNote.update({
      where: { id },
      data: dto,
      include: {
        doctor: { include: { user: { select: { name: true, email: true } } } },
        customer: { include: { user: { select: { name: true, email: true } } } },
        appointment: true,
      },
    });

    return { success: true, data: updated };
  }

  async remove(id: string) {
    await this.findOne(id); // throws if not found
    await this.prisma.sessionNote.delete({ where: { id } });
    return { success: true, message: 'Session note deleted' };
  }
}
