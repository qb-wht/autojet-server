import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '@/user/user.service';
import { AuthMethod, User } from '@prisma/__generated__';
import { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { verify } from 'argon2';
import { ConfigService } from '@nestjs/config';
import { ProviderService } from './provider/provider.service';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailConfirmationService } from './email-confirmation/email-confirmation.service';

@Injectable()
export class AuthService {
  public constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly providerService: ProviderService,
    private readonly prismaService: PrismaService,
    private readonly emailConfirmationService: EmailConfirmationService
  ) {}

  public async register(req: Request, dto: RegisterDto) {
    const { email, password, name } = dto;

    const user = await this.userService.findByEmail(email);

    if (user) {
      throw new ConflictException(
        'Регистрация не удалась. Пользователь с таким email уже существует. Пожалуйста, используйте другой email или войдите в систему.'
      );
    }

    const newUser = await this.userService.create({
      email,
      password,
      name,
      avatar: '', // TODO: Можно генерировать рандомную аватарку.
      method: AuthMethod.CREDENTIALS,
      isVerified: false,
    });

    await this.emailConfirmationService.sendVerificationToken(newUser.email);

    return {
      message:
        'Вы успешно зарегистрировались. Пожалуйста, подтвердите ваш email. Сообщение было отправлено на ваш почтовый адрес.',
    };
  }

  public async login(req: Request, dto: LoginDto) {
    const { email, password } = dto;

    const user = await this.userService.findByEmail(email);

    // * !password, пароля может не быть если пользователь вошел через соцсети
    if (!user || !password) {
      throw new NotFoundException('Пользователь не найден. Пожалуйста проверьте введенные данные.');
    }

    const isValidPassword = await verify(user.password, password);

    if (!isValidPassword) {
      throw new UnauthorizedException(
        'Неверный пароль. Пожалуйста, попробуйте еще раз или восстановите пароль, если забыли его.'
      );
    }

    if (!user.isVerified) {
      await this.emailConfirmationService.sendVerificationToken(user.email);

      throw new UnauthorizedException(
        'Ваш email не подтвержден. Пожалуйста, проверьте вашу почту и подтвердите адрес.'
      );
    }

    this.saveSession(req, user);

    return user;
  }

  public async extractProfileFromCode(req: Request, provider: string, code: string) {
    const providerInstance = this.providerService.findByService(provider);
    const profile = await providerInstance.findUserByCode(code);

    const account = await this.prismaService.account.findFirst({
      where: {
        id: profile.id,
        provider: profile.provider,
      },
    });

    let user = account?.userId ? await this.userService.findById(account.userId) : null;

    if (user) {
      return this.saveSession(req, user);
    }

    user = await this.userService.create({
      email: profile.email,
      password: '',
      name: profile.name,
      avatar: profile.avatar,
      method: AuthMethod[profile.provider.toUpperCase()],
      isVerified: true,
    });

    if (!account) {
      await this.prismaService.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: profile.provider,
          accessToken: profile.access_token,
          refreshToken: profile.refresh_token,
          expiresAt: profile.expires_at,
        },
      });
    }

    return this.saveSession(req, user);
  }

  // TODO: Рефактор
  public async logout(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, rej) => {
      req.session.destroy((err) => {
        if (err) {
          return rej(
            new InternalServerErrorException(
              'Не удалось завершить сессию. Возможно, возникла проблема с сервером или сессия уже завершена.'
            )
          );
        }

        res.clearCookie(this.configService.get('SESSION_NAME'));
        resolve();

        // * Без этого постман долго не получает ответ
        res.json();
      });
    });
  }

  // TODO: Рефактор
  public saveSession(req: Request, user: User) {
    return new Promise((res, rej) => {
      req.session.userId = user.id;

      req.session.save((err) => {
        if (err) {
          return rej(
            new InternalServerErrorException(
              'Не удалось сохранить сессию. Проверьте, правильно ли настроены параметры сессии.'
            )
          );
        }

        res({ user });
      });
    });
  }
}
