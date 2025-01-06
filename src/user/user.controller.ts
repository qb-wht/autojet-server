import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { Authorized } from '@/decorators/authorized.decorator';
import { Authorization } from '@/decorators/auth.decorator';
import { UserRoles } from '@prisma/__generated__';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @Authorization()
  async findProfile(@Authorized('id') id: string) {
    return this.userService.findById(id);
  }

  @Get('by-id/:id')
  @HttpCode(HttpStatus.OK)
  @Authorization(UserRoles.ADMIN)
  async findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }
}
