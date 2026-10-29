import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthResponse, AuthUser, LoginRequest } from '../models';

const TOKEN_STORAGE_KEY = 'employee-service.access-token';

/** Omits `returnUrl` when the destination is already the default page. */
export function loginReturnQuery(url: string | undefined): { returnUrl: string } | undefined {
  const path = url?.split('?')[0] ?? '';
  if (path === '' || path === '/' || path === '/login' || path === '/dashboard') {
    return undefined;
  }
  return { returnUrl: url! };
}

interface JwtPayload {
  sub?: string;
  unique_name?: string;
  name?: string;
  email?: string;
  role?: string | string[];
  exp?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private token: string | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  get currentUser(): AuthUser | null {
    return this.token ? decodeToken(this.token) : null;
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  get roles(): readonly string[] {
    return this.currentUser?.roles ?? [];
  }

  constructor() {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      this.setToken(stored);
    }
    inject(DestroyRef).onDestroy(() => this.clearExpiryTimer());
  }

  /** Current token, or `null` when missing or expired. */
  getToken(): string | null {
    const user = this.currentUser;
    if (!user || user.expiresAt <= Date.now()) {
      return null;
    }
    return this.token;
  }

  /** True when the user holds at least one of `roles`. */
  hasRole(roles: string | readonly string[]): boolean {
    const required = typeof roles === 'string' ? [roles] : roles;
    const owned = this.roles;
    return required.some((role) => owned.includes(role));
  }

  login(request: LoginRequest): Observable<AuthUser> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, request).pipe(
      tap((response) => this.setToken(response.accessToken)),
      map(() => this.currentUser!),
    );
  }

  logout(returnUrl?: string): void {
    this.clearExpiryTimer();
    this.token = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);

    void this.router.navigate(['/login'], { queryParams: loginReturnQuery(returnUrl) });
  }

  private setToken(token: string): void {
    const user = decodeToken(token);
    if (!user || user.expiresAt <= Date.now()) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      this.token = null;
      return;
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    this.token = token;
    this.scheduleExpiry(user.expiresAt);
  }

  private scheduleExpiry(expiresAt: number): void {
    this.clearExpiryTimer();
    // setTimeout overflows above ~24.8 days; tokens are far shorter, but guard anyway.
    const delay = Math.min(expiresAt - Date.now(), 2_147_483_647);
    this.expiryTimer = setTimeout(() => this.logout(this.router.url), delay);
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }
}

function decodeToken(token: string): AuthUser | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) {
      return null;
    }

    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as JwtPayload;

    if (!payload.sub || !payload.exp) {
      return null;
    }

    const roles = payload.role === undefined ? [] : [payload.role].flat();

    return {
      id: Number(payload.sub),
      userName: payload.unique_name ?? '',
      name: payload.name ?? payload.unique_name ?? '',
      email: payload.email ?? '',
      roles,
      expiresAt: payload.exp * 1000,
    };
  } catch {
    return null;
  }
}
