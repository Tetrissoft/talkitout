import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DoctorsModule } from './doctors/doctors.module';
import { CustomersModule } from './customers/customers.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { TimeSlotsModule } from './time-slots/time-slots.module';
import { AiModule } from './ai/ai.module';
import { AssessmentsModule } from './assessments/assessments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DoctorsModule,
    CustomersModule,
    AppointmentsModule,
    TimeSlotsModule,
    AiModule,
    AssessmentsModule,
  ],
})
export class AppModule { }
