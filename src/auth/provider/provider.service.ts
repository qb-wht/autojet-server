import { Inject, Injectable, OnModuleInit } from '@nestjs/common';

import { ProviderOptionsSymbol, TypeOptions } from './provider.constants';
import { BaseOAuthService } from './services/base-oauth.service';
import { Nullable } from '@/types/global';

@Injectable()
export class ProviderService implements OnModuleInit {
  public constructor(@Inject(ProviderOptionsSymbol) private readonly options: TypeOptions) {}

  public onModuleInit() {
    for (const provider of this.options.services) {
      provider.baseUrl = this.options.baseUrl;
    }
  }

  public findByService(service: string): Nullable<BaseOAuthService> {
    return this.options.services.find((s) => s.name === service) ?? null;
  }
}
