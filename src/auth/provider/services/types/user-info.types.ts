import { Nullable } from '@/types/global';

export type UserInfo = {
  id: string;
  avatar: string;
  name: string;
  email: string;
  access_token?: Nullable<string>;
  refresh_token?: string;
  expires_at?: number;
  provider: string;
};
