import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthMethod } from '@prisma/__generated__';
import { hash } from 'argon2';

type CreateUserParams = {
  email: string;
  password: string;
  displayName: string;
  avatar: string;
  method: AuthMethod;
  isVerified: boolean;
};

@Injectable()
export class UserService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async findById(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
      include: {
        accounts: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  public async findByEmail(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
      include: {
        accounts: true,
      },
    });

    return user;
  }

  public async create(params: CreateUserParams) {
    const { email, password, displayName, avatar, method, isVerified } = params;

    const user = await this.prismaService.user.create({
      data: {
        email,
        password: password ? await hash(password) : '',
        displayName,
        avatar,
        method,
        isVerified,
      },
      include: {
        accounts: true,
      },
    });

    return user;
  }
}
