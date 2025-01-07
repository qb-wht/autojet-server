import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TokenTypes } from '@prisma/__generated__';

import { MailService } from '@/libs/mail/mail.service';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class TwoFactorAuthService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService
  ) {}

  public async validateTwoFactorToken(email: string, code: string) {
    const existingToken = await this.prismaService.token.findFirst({
      where: {
        email,
        type: TokenTypes.TWO_FACTOR,
      },
    });

    if (!existingToken) {
      throw new NotFoundException(
        'Токен двухфакторной аутентификации не найден. Убедитесь, что вы запрашивали токен для данного адреса электронной почты.'
      );
    }

    if (existingToken.token !== code) {
      throw new BadRequestException(
        'Неверный код двухфакторной аутентификации. Пожалуйста, проверьте введенный код и попробуйте снова.'
      );
    }

    const hasExpired = new Date(existingToken.expiresIn) < new Date();

    if (hasExpired) {
      throw new BadRequestException(
        'Срок действия токена двухфакторной аутентификации истек. Пожалуйста, запросите новый токен.'
      );
    }

    await this.prismaService.token.delete({
      where: {
        id: existingToken.id,
        type: TokenTypes.TWO_FACTOR,
      },
    });

    return true;
  }

  public async sendTwoFactorToken(email: string) {
    const twoFactorToken = await this.generateTwoFactorToken(email);

    await this.mailService.sendTwoFactorTokenEmail(twoFactorToken.email, twoFactorToken.token);

    return true;
  }

  private async generateTwoFactorToken(email: string) {
    const token = Math.floor(Math.random() * (1000000 - 100000) + 100000).toString();
    const expiresIn = new Date(new Date().getTime() + 300000);

    const existingToken = await this.prismaService.token.findFirst({
      where: {
        email,
        type: TokenTypes.TWO_FACTOR,
      },
    });

    if (existingToken) {
      await this.prismaService.token.delete({
        where: {
          id: existingToken.id,
          type: TokenTypes.TWO_FACTOR,
        },
      });
    }

    const twoFactorToken = await this.prismaService.token.create({
      data: {
        email,
        token,
        expiresIn,
        type: TokenTypes.TWO_FACTOR,
      },
    });

    return twoFactorToken;
  }
}
