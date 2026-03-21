import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AssignInternDto } from './dto/assign-intern.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) { }

  @Post()
  @Roles(UserRole.admin, UserRole.therapist)
  @ApiOperation({ summary: 'Create a new customer profile' })
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }


  @Get()
  @Roles(UserRole.admin, UserRole.therapist, UserRole.intern)
  @ApiOperation({ summary: 'Get all customers' })
  findAll(@Request() req) {
    return this.customersService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.customersService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.therapist)
  @ApiOperation({ summary: 'Update customer' })
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto, @Request() req) {
    return this.customersService.update(id, updateCustomerDto, req.user);
  }

  @Post('assign-intern')
  @Roles(UserRole.admin, UserRole.therapist)
  @ApiOperation({ summary: 'Assign customer to intern' })
  assignToIntern(@Body() assignInternDto: AssignInternDto) {
    return this.customersService.assignToIntern(assignInternDto);
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.therapist)
  @ApiOperation({ summary: 'Delete customer' })
  remove(@Param('id') id: string, @Request() req) {
    return this.customersService.remove(id, req.user);
  }

  @Post(':id/telegram-link')
  @Roles(UserRole.admin, UserRole.therapist)
  @ApiOperation({ summary: 'Generate Telegram deep link for customer' })
  generateTelegramLink(@Param('id') id: string) {
    return this.customersService.generateTelegramLink(id);
  }
}
