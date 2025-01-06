import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

import { RegisterDto } from '@/auth/dto/register.dto';

@ValidatorConstraint({ name: 'IsPasswordsMatching', async: false })
export class IsPasswordsMatchingConstraint implements ValidatorConstraintInterface {
  public validate(passwordRepeat: string, args: ValidationArguments) {
    const obj = args.object as RegisterDto;
    return obj.password === passwordRepeat;
  }

  // TODO: Fix
  public defaultMessage(validationArguments?: ValidationArguments) {
    console.log(validationArguments);

    return 'Пароли не совпадают';
  }
}
