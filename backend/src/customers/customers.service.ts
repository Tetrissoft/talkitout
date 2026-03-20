import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AssignInternDto } from './dto/assign-intern.dto';
import { DoctorType, UserRole } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) { }

  async create(createCustomerDto: CreateCustomerDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: createCustomerDto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingCustomer = await this.prisma.customer.findUnique({
      where: { userId: createCustomerDto.userId },
    });

    if (existingCustomer) {
      throw new BadRequestException('Customer profile already exists for this user');
    }

    const customer = await this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        dateOfBirth: createCustomerDto.dateOfBirth
          ? new Date(createCustomerDto.dateOfBirth)
          : null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
            telegramId: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        assignedIntern: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return { success: true, data: customer };
  }

  async findAll(user: any) {
    let whereClause: any = {};

    if (user.role !== UserRole.admin) {
      if (user.role === UserRole.therapist) {
        // Therapist sees customers assigned to their interns
        const doctor = await this.prisma.doctor.findUnique({
          where: { userId: user.id },
          include: { interns: true },
        });

        if (doctor) {
          const internIds = doctor.interns.map((i) => i.id);
          whereClause = {
            assignedInternId: {
              in: [doctor.id, ...internIds],
            },
          };
        } else {
          whereClause = { id: 'none' };
        }
      } else if (user.role === UserRole.intern) {
        // Intern sees customers assigned to them
        const doctor = await this.prisma.doctor.findUnique({
          where: { userId: user.id },
        });

        if (doctor) {
          whereClause = { assignedInternId: doctor.id };
        } else {
          whereClause = { id: 'none' };
        }
      } else {
        whereClause = { userId: user.id };
      }
    }

    const customers = await this.prisma.customer.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
            telegramId: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        assignedIntern: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: {
        items: customers,
        total: customers.length,
        page: 1,
        pageSize: customers.length,
        totalPages: 1,
      },
    };
  }

  async findOne(id: string, user?: any) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
            telegramId: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        assignedIntern: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (user && user.role !== UserRole.admin) {
      if (user.role === UserRole.therapist || user.role === UserRole.intern) {
        const doctor = await this.prisma.doctor.findUnique({
          where: { userId: user.id },
          include: { interns: true },
        });
        const internIds = doctor?.interns.map((i) => i.id) || [];
        const allowedIds = [doctor?.id, ...internIds].filter(Boolean);
        if (!customer.assignedInternId || !allowedIds.includes(customer.assignedInternId)) {
          throw new ForbiddenException('You are not authorized to view this customer');
        }
      } else if (user.role === UserRole.customer) {
        if (customer.userId !== user.id) {
          throw new ForbiddenException('You are not authorized to view this customer');
        }
      }
    }

    return { success: true, data: customer };
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto, user: any) {
    await this.findOne(id, user);

    const updateData = {
      ...updateCustomerDto,
      dateOfBirth: updateCustomerDto.dateOfBirth
        ? new Date(updateCustomerDto.dateOfBirth)
        : undefined,
    };

    const customer = await this.prisma.customer.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
            telegramId: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        assignedIntern: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return { success: true, data: customer };
  }

  async assignToIntern(assignInternDto: AssignInternDto) {
    const { customerId, internId } = assignInternDto;

    // Verify customer exists
    await this.findOne(customerId);

    // Verify intern exists and is of type intern
    const intern = await this.prisma.doctor.findUnique({
      where: { id: internId },
    });

    if (!intern) {
      throw new NotFoundException('Intern not found');
    }

    if (intern.type !== DoctorType.intern) {
      throw new BadRequestException('Selected doctor is not an intern');
    }

    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: { assignedInternId: internId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
          },
        },
        assignedIntern: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return { success: true, data: customer };
  }

  async remove(id: string, user: any) {
    await this.findOne(id, user);

    await this.prisma.customer.delete({
      where: { id },
    });

    return { success: true, message: 'Customer deleted successfully' };
  }
}
