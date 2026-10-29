import { User } from './user.model';

export interface LoginRequest {
  /** User name or email address. */
  userName: string;
  password: string;
}

/** Response of `POST /api/auth/login`. */
export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  user: User;
}

/** Identity decoded from the JWT payload (the token is the single source of truth). */
export interface AuthUser {
  id: number;
  userName: string;
  name: string;
  email: string;
  roles: string[];
  /** Expiry as epoch milliseconds (`exp` claim × 1000). */
  expiresAt: number;
}
