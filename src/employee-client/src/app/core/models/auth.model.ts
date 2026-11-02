import { User } from './user.model';

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  user: User;
}

export interface AuthUser {
  id: number;
  userName: string;
  name: string;
  email: string;
  roles: string[];
  expiresAt: number;
}
