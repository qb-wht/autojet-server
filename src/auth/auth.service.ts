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

@Injectable()
export class AuthService {
  public constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService
  ) {}

  public async register(req: Request, dto: RegisterDto) {
    const { email, password, displayName } = dto;

    const user = await this.userService.findByEmail(email);

    if (user) {
      throw new ConflictException(
        'Регистрация не удалась. Пользователь с таким email уже существует. Пожалуйста, используйте другой email или войдите в систему.'
      );
    }

    const newUser = await this.userService.create({
      email,
      password,
      displayName,
      avatar: '', // TODO: Можно генерировать рандомную аватарку.
      method: AuthMethod.CREDENTIALS,
      isVerified: false,
    });

    this.saveSession(req, newUser);

    return newUser;
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

    this.saveSession(req, user);

    return user;
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
  private saveSession(req: Request, user: User) {
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
