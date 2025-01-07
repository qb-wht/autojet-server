import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { UserService } from './user.service';
import { Authorized } from '@/decorators/authorized.decorator';
import { Authorization } from '@/decorators/auth.decorator';
import { UserRoles } from '@prisma/__generated__';
import { UpdateUserDto } from './dto/update-user.dto';

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

  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Patch('profile')
  public async updateProfile(@Authorized('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(userId, dto);
  }
}
